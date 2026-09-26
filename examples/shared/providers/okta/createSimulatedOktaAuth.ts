import {
  ACCESS_TOKEN_KEY,
  OKTA_ID,
  OKTA_ISSUER,
  OKTA_LOGOUT_URL,
  OKTA_SUBJECTS,
  OKTA_TOKEN_EXPIRY,
  OKTA_TOKEN_PREFIX,
} from "example-shared/providers/okta/constants/okta";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { HARBOR_ORIGIN } from "example-shared/world/constants/world";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type OktaClaims = {
  iss: string;
  sub: string;
  sid: string;
  name: string;
  preferred_username: string;
  email: string;
  email_verified: boolean;
};

type OktaTokens = {
  idToken?: { idToken: string; claims: OktaClaims };
  accessToken?: { accessToken: string; tokenType: string; expiresAt: number };
  refreshToken?: { refreshToken: string };
};

type OktaAuthState = {
  isAuthenticated: boolean;
  idToken?: OktaTokens["idToken"];
  accessToken?: OktaTokens["accessToken"];
};

type AuthStateHandler = (authState: OktaAuthState) => void;

const isSameAuthState = (previous: OktaAuthState | null, next: OktaAuthState) =>
  previous !== null &&
  previous.isAuthenticated === next.isAuthenticated &&
  previous.idToken === next.idToken &&
  previous.accessToken === next.accessToken;

// Modelled on okta-auth-js 8.0.1, as the adapter's own fake: the token manager updates the auth state whenever it adds or removes a token, the auth state manager emits a copy of each changed state and never the same one twice, a failed renewal removes the access token, and getSignOutRedirectUrl builds the sign-out page. Tokens live in storage every tab shares.
export const createSimulatedOktaAuth = (world: LabWorld) => {
  const handlers: AuthStateHandler[] = [];
  const armed = { signOutUrlFailure: false };
  let tokens: OktaTokens = {};
  let held: ServerSession | null = null;
  let authState: OktaAuthState | null = null;

  const issueTokens = (server: ServerSession): OktaTokens => ({
    idToken: {
      idToken: `okta-id-token.${server.id}`,
      claims: {
        iss: OKTA_ISSUER,
        sub: OKTA_SUBJECTS[server.person],
        sid: server.id,
        name: world.getName(server.person),
        preferred_username: PEOPLE[server.person].email,
        email: PEOPLE[server.person].email,
        email_verified: true,
      },
    },
    accessToken: {
      accessToken: world.issueToken(server, OKTA_TOKEN_PREFIX),
      tokenType: "Bearer",
      expiresAt: OKTA_TOKEN_EXPIRY,
    },
    refreshToken: { refreshToken: `okta-refresh-token.${server.id}` },
  });

  const holdTokens = (server: ServerSession | null) => {
    held = server;
    world.holdSession(OKTA_ID, server);
    tokens = server === null ? {} : issueTokens(server);
  };

  const emitAuthState = async () => {
    await world.waitForStorage();

    const next: OktaAuthState = {
      isAuthenticated:
        tokens.accessToken !== undefined && tokens.idToken !== undefined,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    };

    if (isSameAuthState(authState, next)) {
      return next;
    }

    authState = next;

    for (const handler of [...handlers]) {
      handler({ ...next });
    }

    return next;
  };

  const removeAccessToken = () => {
    const kept = { ...tokens };

    delete kept.accessToken;
    tokens = kept;
    emitAuthState();
  };

  const restoring = world.waitForStorage().then(() => {
    const server = world.getHeldSession(OKTA_ID);

    held = server;
    tokens = server === null ? {} : issueTokens(server);
  });

  const oktaAuth = {
    authStateManager: {
      updateAuthState: async () => {
        world.countCall();
        await restoring;

        return emitAuthState();
      },
      subscribe: (handler: AuthStateHandler) => {
        world.countCall();
        handlers.push(handler);
      },
      unsubscribe: (handler: AuthStateHandler) => {
        world.countCall();

        const kept = handlers.filter((registered) => registered !== handler);

        handlers.splice(0, handlers.length, ...kept);
      },
    },
    tokenManager: {
      getTokensSync: () => {
        world.countCall();

        return { ...tokens };
      },
      hasExpired: (token: { expiresAt: number }) =>
        token.expiresAt * 1000 <= Date.now(),
      getStorageKeyByType: (type: "accessToken") =>
        tokens[type] === undefined ? undefined : ACCESS_TOKEN_KEY,
      renew: async () => {
        world.countCall();

        const renewing = held;

        if (renewing === null) {
          throw new Error(
            "renewTokens() was called but there is no existing token",
          );
        }

        try {
          await world.waitForRefresh();
        } catch (error) {
          removeAccessToken();

          throw error;
        }

        // A sign-in replaced the tokens during the renewal, so it no longer applies.
        if (held !== renewing) {
          return tokens.accessToken;
        }

        const latest = world.getSession(renewing.id);

        if (latest === null || latest.ended) {
          removeAccessToken();

          throw Object.assign(
            new Error("The refresh token is invalid or expired."),
            { errorCode: "invalid_grant" },
          );
        }

        holdTokens(latest);
        emitAuthState();

        return tokens.accessToken;
      },
      clear: () => {
        world.countCall();
        holdTokens(null);
        emitAuthState();
      },
      setTokens: (next: OktaTokens) => {
        world.countCall();

        const sid = next.idToken?.claims.sid;

        held = sid === undefined ? null : world.getSession(sid);
        world.holdSession(OKTA_ID, held);
        tokens = next;
        emitAuthState();
      },
    },
    revokeAccessToken: async () => {
      world.countCall();
      await world.waitForServer();

      return {};
    },
    revokeRefreshToken: async () => {
      world.countCall();
      await world.waitForServer();

      return {};
    },
    getSignOutRedirectUrl: ({ idToken }: { idToken: { idToken: string } }) => {
      world.countCall();

      if (armed.signOutUrlFailure) {
        armed.signOutUrlFailure = false;

        return "";
      }

      return `${OKTA_LOGOUT_URL}?id_token_hint=${encodeURIComponent(idToken.idToken)}&post_logout_redirect_uri=${encodeURIComponent(HARBOR_ORIGIN)}`;
    },
    token: {
      getWithPopup: async ({ loginHint }: { loginHint: string }) => {
        world.countCall();
        await world.waitForServer();

        const person = getPersonByEmail(loginHint);

        if (person === null) {
          throw Object.assign(new Error("Authentication failed"), {
            errorCode: "access_denied",
          });
        }

        return {
          tokens: issueTokens(
            world.openSession({
              provider: OKTA_ID,
              person,
              organization: null,
            }),
          ),
        };
      },
    },
  };

  const openTokens = (person: PersonId) => {
    holdTokens(
      world.openSession({ provider: OKTA_ID, person, organization: null }),
    );
    emitAuthState();
  };

  return {
    oktaAuth,
    // The Okta user profile is updated, and the renewal after it carries the name.
    updateProfile: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      if (held === null) {
        return;
      }

      world.setName(held.person, name);
      holdTokens(held);
      emitAuthState();
    },
    // Another tab signs in, and okta-auth-js syncs the storage every tab shares.
    signInElsewhere: () => {
      openTokens(held === null ? "ada" : OTHER_PEOPLE[held.person]);
    },
    armSignOutUrlFailure: () => {
      armed.signOutUrlFailure = true;
    },
  };
};
