import type { AmplifyJwtLike } from "src/types/AmplifyJwtLike";
import type { AmplifyLike } from "src/types/AmplifyLike";
import type { AmplifyUserLike } from "src/types/AmplifyUserLike";

type HubCallback = Parameters<AmplifyLike["hub"]["listen"]>[1];

type FakeSession = {
  user: AmplifyUserLike;
  accessToken: AmplifyJwtLike;
  idToken: AmplifyJwtLike | undefined;
  expired: boolean;
};

type FakeSignIn = {
  originJti?: string | null;
  username?: string;
  idToken?: boolean;
  signInDetails?: boolean;
};

export const COGNITO_ISSUER =
  "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AnchorPool";

const CLEARING_ERRORS = Object.freeze({
  NotAuthorizedException: true,
  TokenRevokedException: true,
  UserNotFoundException: true,
  PasswordResetRequiredException: true,
  UserNotConfirmedException: true,
  RefreshTokenReuseException: true,
});

const createAuthError = (name: string, message: string) =>
  Object.assign(new Error(message), { name });

const createJwt = (
  payload: AmplifyJwtLike["payload"],
  value: string,
): AmplifyJwtLike => ({ payload, toString: () => value });

// Modelled on aws-amplify 6.20.0: getCurrentUser throws AuthUserPoolException without a configured user pool and UserUnAuthenticatedException without tokens, and answers the ID token's user with the sign-in details, fetchAuthSession answers no tokens without a user pool or a user, both refresh expired or forced tokens and dispatch tokenRefresh, a refresh Cognito refuses dispatches tokenRefresh_failure after clearing the tokens for an authentication error, then answers no tokens for NotAuthorizedException and throws anything else, signOut clears the tokens and dispatches signedOut, except that on React Native a hosted UI logout page the user closes keeps them and dispatches nothing, and Hub.listen answers the function that removes every registration of its callback.
export const createFakeAmplifyAuth = ({
  configured = true,
}: { configured?: boolean } = {}) => {
  const listeners: { channel: string; callback: HubCallback }[] = [];
  const sessionRequests: { forceRefresh: boolean }[] = [];
  const signOuts: { global: false }[] = [];

  const failures: { refresh: unknown; signOut: unknown } = {
    refresh: null,
    signOut: null,
  };

  const logoutPage = { closed: false };
  let issued = 0;
  let sessions = 0;
  let held: FakeSession | null = null;

  const dispatch = (event: string) => {
    for (const { channel, callback } of [...listeners]) {
      if (channel !== "auth") {
        continue;
      }

      callback({ payload: { event } });
    }
  };

  const issueSession = (
    sub: string,
    {
      originJti,
      username = sub,
      idToken = true,
      signInDetails = true,
    }: FakeSignIn = {},
  ): FakeSession => {
    issued += 1;

    const payload = {
      iss: COGNITO_ISSUER,
      sub,
      ...(originJti === null
        ? {}
        : { origin_jti: originJti ?? `origin_${sessions}` }),
    };

    return {
      user: {
        username,
        userId: sub,
        ...(signInDetails
          ? {
              signInDetails: {
                loginId: `${sub}@example.com`,
                authFlowType: "USER_SRP_AUTH",
              },
            }
          : {}),
      },
      accessToken: createJwt(payload, `access.${sub}.${issued}`),
      idToken: idToken ? createJwt(payload, `id.${sub}.${issued}`) : undefined,
      expired: false,
    };
  };

  const refreshSession = (current: FakeSession) => {
    const failure = failures.refresh;

    if (failure === null) {
      issued += 1;

      const { userId } = current.user;

      held = {
        ...current,
        accessToken: createJwt(
          current.accessToken.payload,
          `access.${userId}.${issued}`,
        ),
        idToken:
          current.idToken === undefined
            ? undefined
            : createJwt(current.idToken.payload, `id.${userId}.${issued}`),
        expired: false,
      };
      dispatch("tokenRefresh");

      return held;
    }

    if (
      failure instanceof Error &&
      Object.hasOwn(CLEARING_ERRORS, failure.name)
    ) {
      held = null;
    }

    dispatch("tokenRefresh_failure");

    if (failure instanceof Error && failure.name === "NotAuthorizedException") {
      return null;
    }

    throw failure;
  };

  const loadSession = async (forceRefresh: boolean) => {
    await Promise.resolve();

    if (held === null || (!forceRefresh && !held.expired)) {
      return held;
    }

    return refreshSession(held);
  };

  const sdk = {
    auth: {
      getCurrentUser: async () => {
        if (!configured) {
          throw createAuthError(
            "AuthUserPoolException",
            "Auth UserPool not configured.",
          );
        }

        const current = await loadSession(false);

        if (current === null) {
          throw createAuthError(
            "UserUnAuthenticatedException",
            "User needs to be authenticated to call this API.",
          );
        }

        return { ...current.user };
      },
      fetchAuthSession: async (options: { forceRefresh: boolean }) => {
        sessionRequests.push(options);

        const current = configured
          ? await loadSession(options.forceRefresh)
          : null;

        if (current === null) {
          return { tokens: undefined };
        }

        return {
          tokens: {
            accessToken: current.accessToken,
            idToken: current.idToken,
          },
        };
      },
      signOut: async (input: { global: false }) => {
        signOuts.push(input);

        if (!configured) {
          throw createAuthError(
            "AuthUserPoolException",
            "Auth UserPool not configured.",
          );
        }

        if (failures.signOut !== null) {
          throw failures.signOut;
        }

        if (logoutPage.closed) {
          return;
        }

        held = null;
        dispatch("signedOut");
      },
    },
    hub: {
      listen: (channel: "auth", callback: HubCallback) => {
        listeners.push({ channel, callback });

        return () => {
          const kept = listeners.filter(
            (listener) => listener.callback !== callback,
          );

          listeners.splice(0, listeners.length, ...kept);
        };
      },
    },
  } satisfies AmplifyLike;

  return {
    sdk,
    sessionRequests,
    signOuts,
    failures,
    dispatch,
    listeners: () => listeners.length,
    session: () => held,
    signIn: (sub: string, options: FakeSignIn = {}) => {
      sessions += 1;
      held = issueSession(sub, options);
      dispatch("signedIn");
    },
    switchSilently: (sub: string, options: FakeSignIn = {}) => {
      sessions += 1;
      held = issueSession(sub, options);
    },
    expire: () => {
      if (held === null) {
        return;
      }

      held = { ...held, expired: true };
    },
    closeLogoutPage: () => {
      logoutPage.closed = true;
    },
  };
};
