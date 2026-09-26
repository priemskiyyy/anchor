import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkRequestStateLike } from "src/types/ClerkRequestStateLike";

type FakeSession = {
  userId: string;
  sessionId: string;
  status: "active" | "pending";
  orgId: string | undefined;
  actor: { sub: string } | undefined;
  expired: boolean;
  refreshedCookie: string | null;
};

type FakeState = {
  status: "signed-out" | "handshake";
  reason: string;
  message: string;
  headers: Headers;
};

export const FRONTEND_API_URL = "https://clerk.anchor.example";

const getSessionToken = (request: Request) =>
  /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ??
  /(?:^|;\s*)__session=([^;]+)/.exec(
    request.headers.get("cookie") ?? "",
  )?.[1] ??
  null;

const createUser = (id: string) => ({
  id,
  externalId: null,
  username: id,
  firstName: id.toUpperCase(),
  lastName: "Lovelace",
  fullName: `${id.toUpperCase()} Lovelace`,
  imageUrl: `https://img.clerk.com/${id}.png`,
  primaryEmailAddress: { id: `idn_${id}`, emailAddress: `${id}@example.com` },
  primaryPhoneNumber: null,
  publicMetadata: { role: "editor" },
});

// A signed-out request state with the headers Clerk sets on one: its auth status, reason and message.
const getSignedOutState = (
  reason: string,
  message: string,
): ClerkRequestStateLike => ({
  status: "signed-out",
  reason,
  message,
  headers: new Headers({
    ...(message === "" ? {} : { "x-clerk-auth-message": message }),
    "x-clerk-auth-reason": reason,
    "x-clerk-auth-status": "signed-out",
  }),
});

// Modelled on @clerk/backend 3.18.1: authenticateRequest() reads the session token from the Authorization header or the __session cookie, answers signed out with its reason for no token, a forged one or an expired one outside a page navigation, a handshake for an expired token on a navigation, and signed in with the headers of a refresh; toAuth() answers a pending session as signed out unless told otherwise; users.getUser() answers the Backend API's user.
export const createFakeClerkBackend = () => {
  const sessions = new Map<string, FakeSession>();
  const users = new Map<string, ReturnType<typeof createUser>>();

  const requests: {
    url: string;
    method: string;
    headers: [string, string][];
    options: object;
  }[] = [];

  const toAuthOptions: object[] = [];

  const failures: { state: FakeState | null; getUser: unknown } = {
    state: null,
    getUser: null,
  };

  const getRequestState = (
    request: Request,
    options: { authorizedParties?: string[] },
  ): ClerkRequestStateLike => {
    if (failures.state !== null) {
      return failures.state;
    }

    const token = getSessionToken(request);
    const session = sessions.get(token ?? "");
    const headers = new Headers();

    if (token === null) {
      return getSignedOutState("session-token-and-uat-missing", "");
    }

    if (session === undefined) {
      return getSignedOutState(
        "token-invalid-signature",
        "JWT signature is invalid.",
      );
    }

    if (
      options.authorizedParties !== undefined &&
      !options.authorizedParties.includes("https://app.anchor.example")
    ) {
      return getSignedOutState(
        "token-invalid-authorized-parties",
        "Invalid JWT Authorized party claim (azp).",
      );
    }

    if (
      session.expired &&
      request.headers.get("sec-fetch-dest") === "document"
    ) {
      return {
        status: "handshake",
        reason: "session-token-expired-refresh-non-eligible-no-refresh-cookie",
        message: "JWT is expired.",
        headers: new Headers({
          location: `${FRONTEND_API_URL}/v1/client/handshake?redirect_url=${encodeURIComponent(request.url)}`,
          "cache-control": "no-store",
        }),
      };
    }

    if (session.expired) {
      return getSignedOutState(
        "session-token-expired-refresh-non-eligible-no-refresh-cookie",
        "JWT is expired.",
      );
    }

    if (session.refreshedCookie !== null) {
      headers.append("set-cookie", session.refreshedCookie);
    }

    return {
      status: "signed-in",
      headers,
      toAuth: (authOptions: { treatPendingAsSignedOut: false }) => {
        toAuthOptions.push(authOptions);

        return {
          sessionClaims: { iss: FRONTEND_API_URL },
          sessionId: session.sessionId,
          sessionStatus: session.status,
          userId: session.userId,
          orgId: session.orgId,
          actor: session.actor,
        };
      },
    };
  };

  const sdk = {
    authenticateRequest: async (
      request: Request,
      options: { authorizedParties?: string[] },
    ) => {
      requests.push({
        url: request.url,
        method: request.method,
        headers: [...request.headers],
        options,
      });

      return getRequestState(request, options);
    },
    users: {
      getUser: async (userId: string) => {
        if (failures.getUser !== null) {
          throw failures.getUser;
        }

        const user = users.get(userId);

        if (user === undefined) {
          throw new Error(`Not Found: ${userId}`);
        }

        return user;
      },
    },
  } satisfies ClerkLike;

  return {
    sdk,
    requests,
    toAuthOptions,
    failures,
    signIn: (
      token: string,
      userId: string,
      session: Partial<Omit<FakeSession, "userId">> = {},
    ) => {
      users.set(userId, createUser(userId));
      sessions.set(token, {
        userId,
        sessionId: `sess_${userId}`,
        status: "active",
        orgId: undefined,
        actor: undefined,
        expired: false,
        refreshedCookie: null,
        ...session,
      });
    },
    expire: (token: string) => {
      const session = sessions.get(token);

      if (session === undefined) {
        return;
      }

      sessions.set(token, { ...session, expired: true });
    },
  };
};

export const requestWith = (
  headers: Record<string, string>,
  { url = "https://app.anchor.example/", method = "GET" } = {},
) => new Request(url, { method, headers });
