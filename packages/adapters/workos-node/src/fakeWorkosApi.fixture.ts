import { createSign, generateKeyPairSync } from "node:crypto";
import { WorkOS } from "@workos-inc/node";
import { vi } from "vitest";

type FakeUser = {
  id: string;
  name: string;
  organizationId: string | undefined;
  impersonator: { email: string; reason: string | null } | undefined;
  lifetime: number;
};

type FakeSession = { id: string; user: FakeUser; ended: boolean };

export const COOKIE_PASSWORD = "anchor-workos-cookie-password-0123456789";

const API_KEY = "sk_test_anchor";

export const CLIENT_ID = "client_anchor";

const KEY_ID = "sso_oidc_key_pair_anchor";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const mintAccessToken = (session: FakeSession, lifetime: number) => {
  const now = Math.floor(Date.now() / 1000);

  const unsigned = [
    encodeSegment({ alg: "RS256", kid: KEY_ID, typ: "JWT" }),
    encodeSegment({
      iss: `https://api.workos.com/user_management/${CLIENT_ID}`,
      sub: session.user.id,
      sid: session.id,
      jti: `jti_${now}_${session.id}`,
      ...(session.user.organizationId === undefined
        ? {}
        : { org_id: session.user.organizationId, role: "member" }),
      iat: now,
      exp: now + lifetime,
    }),
  ].join(".");

  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey)
    .toString("base64url");

  return `${unsigned}.${signature}`;
};

const getUserJson = ({ id, name }: FakeUser) => ({
  object: "user",
  id,
  email: `${name}@example.com`,
  email_verified: true,
  profile_picture_url: null,
  name: name.toUpperCase(),
  first_name: name.toUpperCase(),
  last_name: "Lovelace",
  last_sign_in_at: "2026-09-25T00:00:00.000Z",
  locale: null,
  created_at: "2026-09-25T00:00:00.000Z",
  updated_at: "2026-09-25T00:00:00.000Z",
  external_id: null,
  metadata: {},
});

// A real @workos-inc/node client whose requests are answered in-process, as the WorkOS API answers them: the JWKS its access tokens are signed with, the password grant, AuthKit's code exchange, and the refresh grant, which rotates the refresh token and refuses a spent one or an ended session with invalid_grant. Sealing and unsealing are the SDK's own.
export const createWorkosServer = () => {
  const users = new Map<string, FakeUser>();
  const sessions = new Map<string, FakeSession>();
  const refreshTokens = new Map<string, string>();
  const codes = new Map<string, string>();
  const grants: string[] = [];
  const failures = { jwks: false, authenticate: false };

  let issued = 0;

  const issueTokens = (session: FakeSession, lifetime: number) => {
    issued += 1;

    const refreshToken = `refresh_${issued}`;

    refreshTokens.set(refreshToken, session.id);

    return Response.json({
      user: getUserJson(session.user),
      organization_id: session.user.organizationId,
      access_token: mintAccessToken(session, lifetime),
      refresh_token: refreshToken,
      authentication_method: "Password",
      ...(session.user.impersonator === undefined
        ? {}
        : { impersonator: session.user.impersonator }),
    });
  };

  const authenticate = async (request: Request) => {
    const body: {
      grant_type: string;
      email?: string;
      code?: string;
      refresh_token?: string;
    } = await request.json();

    grants.push(body.grant_type);

    if (
      body.grant_type === "password" ||
      body.grant_type === "authorization_code"
    ) {
      const user = users.get(
        body.grant_type === "password"
          ? (body.email ?? "")
          : (codes.get(body.code ?? "") ?? ""),
      );

      if (user === undefined) {
        return Response.json(
          { code: "invalid_credentials", message: "Invalid credentials." },
          { status: 400 },
        );
      }

      const session = { id: `session_${user.name}`, user, ended: false };

      sessions.set(session.id, session);

      return issueTokens(session, user.lifetime);
    }

    const session = sessions.get(
      refreshTokens.get(body.refresh_token ?? "") ?? "",
    );

    refreshTokens.delete(body.refresh_token ?? "");

    if (session === undefined || session.ended) {
      return Response.json(
        {
          error: "invalid_grant",
          error_description: "Session has already ended.",
        },
        { status: 400 },
      );
    }

    return issueTokens(session, 300);
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);

    const isJwks = url.pathname === `/sso/jwks/${CLIENT_ID}`;

    if (isJwks ? failures.jwks : failures.authenticate) {
      throw new TypeError("fetch failed");
    }

    if (isJwks) {
      return Response.json({
        keys: [
          {
            ...publicKey.export({ format: "jwk" }),
            kid: KEY_ID,
            alg: "RS256",
            use: "sig",
          },
        ],
      });
    }

    if (url.pathname === "/user_management/authenticate") {
      return authenticate(request);
    }

    return Response.json({ message: "Not Found" }, { status: 404 });
  });

  const sdk = new WorkOS(API_KEY, { clientId: CLIENT_ID, maxRetries: 0 });

  return {
    sdk,
    grants,
    failures,
    // Signs a new user in through the real client's password grant, and answers the session it sealed.
    signUp: async (
      name: string,
      {
        organizationId,
        impersonator,
        lifetime = 300,
      }: Partial<
        Pick<FakeUser, "organizationId" | "impersonator" | "lifetime">
      > = {},
    ) => {
      const user = {
        id: `user_${name}`,
        name,
        organizationId,
        impersonator,
        lifetime,
      };

      users.set(`${name}@example.com`, user);

      const { sealedSession } =
        await sdk.userManagement.authenticateWithPassword({
          clientId: CLIENT_ID,
          email: `${name}@example.com`,
          password: "correct-horse-battery-staple",
          session: { sealSession: true, cookiePassword: COOKIE_PASSWORD },
        });

      return { userId: user.id, cookie: `wos-session=${sealedSession ?? ""}` };
    },
    // The code a browser returns from a sign-in of this user, for AuthKit's code exchange.
    issueCode: (name: string) => {
      const code = `code_${name}`;

      codes.set(code, `${name}@example.com`);

      return code;
    },
    end: (userId: string) => {
      for (const session of sessions.values()) {
        session.ended = session.ended || session.user.id === userId;
      }
    },
  };
};
