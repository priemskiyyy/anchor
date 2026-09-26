import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosUserLike } from "src/types/WorkosUserLike";
import { workosRefreshes } from "src/workosRefreshes";

type AuthKitState = "INITIAL" | "AUTHENTICATED" | "ERROR";

type ServerSession = {
  id: string;
  user: WorkosUserLike;
  organizationId: string | undefined;
  impersonator: { email: string; reason: string | null } | undefined;
};

type FakeSignIn = { organization?: string; impersonator?: string };

type FakeFailures = {
  /** Every refresh fails with this, as a network error or a WorkOS 5xx does; AuthKit keeps the session and retries later. */
  refresh: unknown;
  /** The logout request never reaches WorkOS, so its session survives the sign-out. */
  logout: boolean;
};

const createUser = (subject: string): WorkosUserLike => ({
  id: subject,
  email: `${subject}@example.com`,
  emailVerified: true,
  firstName: subject.toUpperCase(),
  lastName: null,
  profilePictureUrl: null,
  externalId: undefined,
});

const createLoginRequiredError = () => new Error("No access token available");

const createRefusedRefreshError = () =>
  Object.assign(new Error("Invalid refresh token"), {
    name: "RefreshError",
    status: 400,
    error: "invalid_grant",
    isTransient: false,
  });

const isTransientFailure = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "isTransient" in error &&
  error.isTransient === true;

// Modelled on authkit-js 0.20.2: the client keeps the user and the access token in memory and calls onRefresh whenever it stores them, after a sign-in, a refresh and an organization switch; getAccessToken() refreshes when forced, when the token is about to expire, before its first refresh and while it holds no token, and answers LoginRequiredError once WorkOS refused the refresh or there is nothing to refresh; a refresh WorkOS refuses clears the session and calls onRefreshFailure unless it was the first, while any other failure keeps the session and is thrown; signOut({ navigate: false }) clears the session, sends WorkOS a logout request whose answer it ignores, and leaves the client's state authenticated, so the next getAccessToken() refreshes.
export const createFakeAuthKitClient = () => {
  const refreshes = workosRefreshes();
  const logouts: Array<{ session: string; navigate: boolean }> = [];
  const refreshRequests: Array<{ organizationId: string | undefined }> = [];
  const failures: FakeFailures = { refresh: null, logout: false };
  let subscribed = 0;
  let state: AuthKitState = "INITIAL";
  let server: ServerSession | null = null;
  let expired = false;
  let sessions = 0;
  let issued = 0;

  let held: {
    user: WorkosUserLike;
    accessToken: string;
    sessionId: string;
  } | null = null;

  const store = (session: ServerSession) => {
    issued += 1;
    held = {
      user: session.user,
      accessToken: `access.${session.user.id}.${issued}`,
      sessionId: session.id,
    };
    state = "AUTHENTICATED";
    expired = false;
    refreshes.handleRefresh({
      organizationId: session.organizationId,
      impersonator: session.impersonator,
    });
  };

  const refresh = (organizationId?: string) => {
    const beginning = state;

    refreshRequests.push({ organizationId });

    if (failures.refresh !== null) {
      state = "AUTHENTICATED";

      throw failures.refresh;
    }

    if (server === null) {
      held = null;
      state = "ERROR";

      if (beginning !== "INITIAL") {
        refreshes.handleRefreshFailure();
      }

      throw createRefusedRefreshError();
    }

    server = {
      ...server,
      organizationId: organizationId ?? server.organizationId,
    };
    store(server);
  };

  const shouldRefresh = () =>
    state === "INITIAL" ||
    (state === "AUTHENTICATED" && (held === null || expired));

  const sdk: WorkosClientLike = {
    getUser: () => held?.user ?? null,
    getAccessToken: async ({ forceRefresh }) => {
      if (forceRefresh || shouldRefresh()) {
        try {
          refresh();
        } catch (error) {
          if (
            isTransientFailure(error) &&
            !forceRefresh &&
            !expired &&
            held !== null
          ) {
            return held.accessToken;
          }

          if (
            !isTransientFailure(error) &&
            error instanceof Error &&
            error.name === "RefreshError"
          ) {
            throw createLoginRequiredError();
          }

          throw error;
        }
      }

      if (held === null) {
        throw createLoginRequiredError();
      }

      return held.accessToken;
    },
    signOut: async ({ navigate }) => {
      if (held === null) {
        throw new Error(
          "SignOut() called without an active session. Provide a returnTo URL to redirect anyway.",
        );
      }

      logouts.push({ session: held.sessionId, navigate });
      held = null;

      if (failures.logout) {
        return;
      }

      server = null;
    },
  };

  const countedRefreshes = {
    ...refreshes,
    subscribe: (listener: () => void) => {
      const unsubscribe = refreshes.subscribe(listener);

      subscribed += 1;

      return () => {
        subscribed -= 1;
        unsubscribe();
      };
    },
  };

  return {
    sdk,
    refreshes: countedRefreshes,
    logouts,
    refreshRequests,
    failures,
    listeners: () => subscribed,
    signIn: (
      subject: string,
      { organization, impersonator }: FakeSignIn = {},
    ) => {
      sessions += 1;
      server = {
        id: `session_${sessions}`,
        user: createUser(subject),
        organizationId: organization,
        impersonator:
          impersonator === undefined
            ? undefined
            : { email: impersonator, reason: null },
      };
      store(server);
    },
    // The session a page restores from its refresh token, whose first refresh failed on the network.
    restoreOffline: (subject: string, failure: unknown) => {
      sessions += 1;
      server = {
        id: `session_${sessions}`,
        user: createUser(subject),
        organizationId: undefined,
        impersonator: undefined,
      };
      failures.refresh = failure;
      state = "AUTHENTICATED";
    },
    switchToOrganization: (organizationId: string) => refresh(organizationId),
    switchSilently: (subject: string) => {
      if (held === null) {
        return;
      }

      held = { ...held, user: createUser(subject) };
    },
    endAtWorkos: () => {
      server = null;
    },
    // One tick of AuthKit's automatic refresh, which refreshes a token about to expire and keeps quiet about a failure.
    refreshAutomatically: () => {
      if (!shouldRefresh()) {
        return;
      }

      try {
        refresh();
      } catch {
        return;
      }
    },
    expire: () => {
      expired = true;
    },
  };
};
