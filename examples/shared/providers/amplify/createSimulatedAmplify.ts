import type { AmplifyJwtLike } from "@priemskiyyy/anchor-amplify";

import {
  AMPLIFY_ID,
  COGNITO_ISSUER,
  COGNITO_SUBJECTS,
  COGNITO_TOKEN_PREFIX,
  NOT_AUTHORIZED_EXCEPTION,
  USER_ALREADY_AUTHENTICATED_EXCEPTION,
} from "example-shared/providers/amplify/constants/amplify";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type HubCallback = (capsule: { payload: { event: string } }) => void;

type HubListener = { channel: string; callback: HubCallback };

const createAuthError = (name: string, message: string) =>
  Object.assign(new Error(message), { name });

// Modelled on aws-amplify 6.20.0, as the adapter's own fake: getCurrentUser throws UserUnAuthenticatedException without tokens and answers the ID token's user with how it signed in, fetchAuthSession answers the stored tokens and refreshes them when forced, dispatching tokenRefresh, or, when Cognito refuses, clears them, dispatches tokenRefresh_failure and answers none, signIn refuses a second user, signOut revokes the refresh token, goes on when that fails, clears the tokens and dispatches signedOut, updateUserAttributes dispatches nothing, and Hub.listen answers the function that removes its callback. The tokens live in localStorage, which every tab shares and no tab watches.
export const createSimulatedAmplify = (world: LabWorld) => {
  const listeners: HubListener[] = [];
  const tokens = new Map<string, string>();

  const dispatch = (event: string) => {
    for (const { channel, callback } of [...listeners]) {
      if (channel !== "auth") {
        continue;
      }

      callback({ payload: { event } });
    }
  };

  const getStoredSession = () => world.getHeldSession(AMPLIFY_ID);

  const storeSession = (session: ServerSession | null) => {
    world.holdSession(AMPLIFY_ID, session);
  };

  const createJwt = (
    session: ServerSession,
    value: string,
  ): AmplifyJwtLike => ({
    payload: {
      iss: COGNITO_ISSUER,
      sub: COGNITO_SUBJECTS[session.person],
      origin_jti: session.id,
    },
    toString: () => value,
  });

  const getTokens = (session: ServerSession) => {
    const accessToken =
      tokens.get(session.id) ?? world.issueToken(session, COGNITO_TOKEN_PREFIX);

    tokens.set(session.id, accessToken);

    return {
      accessToken: createJwt(session, accessToken),
      idToken: createJwt(session, `cognito-id-token.${session.id}`),
    };
  };

  const refreshTokens = async (session: ServerSession) => {
    try {
      await world.waitForRefresh();
    } catch (error) {
      // A refresh the network failed keeps the tokens.
      dispatch("tokenRefresh_failure");

      throw error;
    }

    const latest = world.getSession(session.id);

    if (latest === null || latest.ended) {
      // Cognito refused with NotAuthorizedException, so Amplify clears the tokens it refreshed and answers none.
      if (getStoredSession()?.id === session.id) {
        storeSession(null);
        tokens.delete(session.id);
      }

      dispatch("tokenRefresh_failure");

      return undefined;
    }

    tokens.set(latest.id, world.issueToken(latest, COGNITO_TOKEN_PREFIX));
    dispatch("tokenRefresh");

    return getTokens(latest);
  };

  const auth = {
    getCurrentUser: async () => {
      world.countCall();
      await world.waitForStorage();

      const session = getStoredSession();

      if (session === null) {
        throw createAuthError(
          "UserUnAuthenticatedException",
          "User needs to be authenticated to call this API.",
        );
      }

      const subject = COGNITO_SUBJECTS[session.person];

      return {
        username: subject,
        userId: subject,
        signInDetails: {
          loginId: PEOPLE[session.person].email,
          authFlowType: "USER_SRP_AUTH",
        },
      };
    },
    fetchAuthSession: async ({ forceRefresh }: { forceRefresh: boolean }) => {
      world.countCall();
      await world.waitForStorage();

      const session = getStoredSession();

      if (session === null) {
        return { tokens: undefined };
      }

      if (!forceRefresh) {
        return { tokens: getTokens(session) };
      }

      return { tokens: await refreshTokens(session) };
    },
    signIn: async ({ username }: { username: string; password: string }) => {
      world.countCall();

      if (getStoredSession() !== null) {
        throw createAuthError(
          USER_ALREADY_AUTHENTICATED_EXCEPTION,
          "There is already a signed in user.",
        );
      }

      await world.waitForServer();

      const person = getPersonByEmail(username);

      if (person === null) {
        throw createAuthError(
          NOT_AUTHORIZED_EXCEPTION,
          "Incorrect username or password.",
        );
      }

      storeSession(
        world.openSession({ provider: AMPLIFY_ID, person, organization: null }),
      );
      dispatch("signedIn");

      return { isSignedIn: true, nextStep: { signInStep: "DONE" } };
    },
    // Without an input, as with { global: false }, a sign-out of this device only.
    signOut: async () => {
      world.countCall();

      const session = getStoredSession();

      // Revoking the refresh token ends the session at Cognito, and Amplify goes on when the request fails.
      try {
        await world.waitForServer();

        if (session !== null) {
          world.endSession(session.id);
        }
      } catch {
        // The tokens are cleared on this device all the same.
      }

      storeSession(null);

      if (session !== null) {
        tokens.delete(session.id);
      }

      dispatch("signedOut");
    },
    updateUserAttributes: async ({
      userAttributes,
    }: {
      userAttributes: { name: string };
    }) => {
      world.countCall();

      const session = getStoredSession();

      if (session === null) {
        throw createAuthError(
          "UserUnAuthenticatedException",
          "User needs to be authenticated to call this API.",
        );
      }

      await world.waitForServer();
      world.setName(session.person, userAttributes.name);

      return { name: { isUpdated: true } };
    },
  };

  const hub = {
    listen: (channel: "auth", callback: HubCallback) => {
      listeners.push({ channel, callback });

      return () => {
        const kept = listeners.filter(
          (listener) => listener.callback !== callback,
        );

        listeners.splice(0, listeners.length, ...kept);
      };
    },
  };

  return {
    auth,
    hub,
    // Another tab signs Ada out and the other person in on the shared localStorage, and tells this tab nothing.
    signInElsewhere: () => {
      const current = getStoredSession();

      if (current !== null) {
        world.endSession(current.id);
      }

      const person = current === null ? "ada" : OTHER_PEOPLE[current.person];

      storeSession(
        world.openSession({ provider: AMPLIFY_ID, person, organization: null }),
      );
    },
    sendDuplicateEvent: () => {
      dispatch("tokenRefresh");
    },
  };
};
