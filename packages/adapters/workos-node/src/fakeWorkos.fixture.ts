import type { WorkosLike } from "src/types/WorkosLike";

type FakeSession = {
  userId: string;
  sessionId: string;
  organizationId: string | undefined;
  impersonator: { email: string; reason: string | null } | undefined;
  expired: boolean;
};

type FakeRefreshFailure = {
  authenticated: false;
  reason: string;
  retryable: boolean;
  error?: unknown;
};

type FakeAuthenticated = {
  authenticated: true;
  sessionId: string;
  user: ReturnType<typeof createUser>;
  organizationId?: string;
  impersonator?: { email: string; reason: string | null };
};

export const COOKIE_PASSWORD = "anchor-workos-cookie-password-0123456789";

const createUser = (id: string) => ({
  object: "user",
  id,
  email: `${id}@example.com`,
  emailVerified: true,
  profilePictureUrl: null,
  name: id.toUpperCase(),
  firstName: id.toUpperCase(),
  lastName: "Lovelace",
  lastSignInAt: "2026-09-25T00:00:00.000Z",
  locale: null,
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
  externalId: null,
  metadata: { plan: "team" },
});

// Modelled on @workos-inc/node 10.13.0: loadSealedSession() answers a CookieSession whose authenticate() answers invalid_session_cookie for a seal it cannot open with its password, invalid_jwt for an access token that no longer verifies, and the session otherwise; refresh() seals a renewed session, or answers a terminal failure such as invalid_grant, or a retryable one with its error.
export const createFakeWorkos = () => {
  const sessions = new Map<string, FakeSession>();
  const loads: { sessionData: string; cookiePassword: string }[] = [];
  const refreshes: string[] = [];

  const failures: { refresh: FakeRefreshFailure | null } = { refresh: null };

  let sealed = 0;

  const loadSealedSession = ({
    sessionData,
    cookiePassword,
  }: {
    sessionData: string;
    cookiePassword: string;
  }) => {
    loads.push({ sessionData, cookiePassword });

    const session =
      cookiePassword === COOKIE_PASSWORD
        ? sessions.get(sessionData)
        : undefined;

    const getAuthenticated = ({
      userId,
      sessionId,
      organizationId,
      impersonator,
    }: FakeSession): FakeAuthenticated => ({
      authenticated: true,
      sessionId,
      user: createUser(userId),
      ...(organizationId === undefined ? {} : { organizationId }),
      ...(impersonator === undefined ? {} : { impersonator }),
    });

    return {
      authenticate: async (): Promise<
        FakeAuthenticated | { authenticated: false; reason: string }
      > => {
        if (session === undefined) {
          return { authenticated: false, reason: "invalid_session_cookie" };
        }

        if (session.expired) {
          return { authenticated: false, reason: "invalid_jwt" };
        }

        return getAuthenticated(session);
      },
      refresh: async (): Promise<
        (FakeAuthenticated & { sealedSession: string }) | FakeRefreshFailure
      > => {
        refreshes.push(sessionData);

        if (session === undefined) {
          return {
            authenticated: false,
            reason: "invalid_session_cookie",
            retryable: false,
          };
        }

        if (failures.refresh !== null) {
          return failures.refresh;
        }

        sealed += 1;

        const sealedSession = `sealed_${session.userId}_${sealed}`;

        sessions.set(sealedSession, { ...session, expired: false });

        return { ...getAuthenticated(session), sealedSession };
      },
    };
  };

  const sdk = { userManagement: { loadSealedSession } } satisfies WorkosLike;

  return {
    sdk,
    loads,
    refreshes,
    failures,
    signIn: (
      sessionData: string,
      userId: string,
      session: Partial<Omit<FakeSession, "userId">> = {},
    ) => {
      sessions.set(sessionData, {
        userId,
        sessionId: `session_${userId}`,
        organizationId: undefined,
        impersonator: undefined,
        expired: false,
        ...session,
      });
    },
    expire: (sessionData: string) => {
      const session = sessions.get(sessionData);

      if (session === undefined) {
        return;
      }

      sessions.set(sessionData, { ...session, expired: true });
    },
  };
};

export const requestWithCookie = (cookie: string | null) =>
  new Request("https://app.example.com/", {
    headers: cookie === null ? {} : { cookie },
  });
