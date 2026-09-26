import { createSign, generateKeyPairSync } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { vi } from "vitest";

type FakeUser = { id: string; name: string };

type SessionClaims = {
  sid?: string;
  sts?: "active" | "pending";
  o?: { id: string; rol: string; slg: string };
  act?: { sub: string };
  azp?: string;
};

export const FRONTEND_API = "clerk.anchor.example";

const SECRET_KEY = "sk_live_anchor_test_secret_key";

export const PUBLISHABLE_KEY = `pk_live_${Buffer.from(`${FRONTEND_API}$`).toString("base64")}`;

// A 2048-bit RSA key, the kind whose PEM Clerk's jwtKey option takes to verify session tokens without asking Clerk.
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

// A session token as Clerk's Frontend API mints it, signed with the key the client verifies with.
export const mintSessionToken = (
  userId: string,
  claims: SessionClaims = {},
  { lifetime = 60 }: { lifetime?: number } = {},
) => {
  const now = Math.floor(Date.now() / 1000);

  const unsigned = [
    encodeSegment({ alg: "RS256", kid: "ins_anchor", typ: "JWT" }),
    encodeSegment({
      azp: "https://app.anchor.example",
      exp: now + lifetime,
      fva: [0, -1],
      iat: now,
      iss: `https://${FRONTEND_API}`,
      nbf: now - 10,
      sid: `sess_${userId}`,
      sub: userId,
      v: 2,
      sts: "active",
      ...claims,
    }),
  ].join(".");

  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey)
    .toString("base64url");

  return { token: `${unsigned}.${signature}`, issuedAt: now };
};

const getUserJson = ({ id, name }: FakeUser) => ({
  object: "user",
  id,
  username: name,
  first_name: name.toUpperCase(),
  last_name: "Lovelace",
  image_url: `https://img.clerk.com/${id}.png`,
  has_image: true,
  primary_email_address_id: `idn_${id}`,
  primary_phone_number_id: null,
  primary_web3_wallet_id: null,
  password_enabled: true,
  two_factor_enabled: false,
  totp_enabled: false,
  backup_code_enabled: false,
  email_addresses: [
    {
      object: "email_address",
      id: `idn_${id}`,
      email_address: `${name}@example.com`,
      verification: null,
      linked_to: [],
    },
  ],
  phone_numbers: [],
  web3_wallets: [],
  external_accounts: [],
  enterprise_accounts: [],
  public_metadata: { role: "editor" },
  private_metadata: {},
  unsafe_metadata: {},
  external_id: null,
  last_sign_in_at: 1_790_000_000_000,
  banned: false,
  locked: false,
  created_at: 1_790_000_000_000,
  updated_at: 1_790_000_000_000,
  last_active_at: 1_790_000_000_000,
  create_organization_enabled: true,
  create_organizations_limit: null,
  delete_self_enabled: true,
  legal_accepted_at: null,
  locale: null,
});

type BrowserSession = { id: string; userId: string; claims: SessionClaims };

// A real @clerk/backend client that verifies session tokens with the local key and whose requests are answered in-process: the Backend API's GET /v1/users/:id answers the user, or a 500 while the API fails, and the Frontend API answers what clerk-js loads for the sessions signed in through signInBrowser(), each with a token signed by the same key.
export const createClerkServer = () => {
  const users = new Map<string, FakeUser>();
  const browserSessions: BrowserSession[] = [];
  const requests: string[] = [];
  const failures = { api: false };

  const getSessionJson = ({ id, userId, claims }: BrowserSession) => {
    const user = users.get(userId);

    return {
      object: "session",
      id,
      status: claims.sts ?? "active",
      expire_at: Date.now() + 86_400_000,
      abandon_at: Date.now() + 86_400_000,
      last_active_at: Date.now(),
      last_active_organization_id: claims.o?.id ?? null,
      actor: claims.act ?? null,
      tasks: null,
      user:
        user === undefined
          ? null
          : { ...getUserJson(user), organization_memberships: [] },
      public_user_data: { identifier: `${user?.name ?? ""}@example.com` },
      created_at: 1_790_000_000_000,
      updated_at: 1_790_000_000_000,
      last_active_token: {
        object: "token",
        jwt: mintSessionToken(userId, { sid: id, ...claims }).token,
      },
    };
  };

  const getClientJson = () => ({
    object: "client",
    id: "client_anchor",
    sessions: browserSessions.map(getSessionJson),
    last_active_session_id: browserSessions.at(-1)?.id ?? null,
    sign_in: null,
    sign_up: null,
    created_at: 1_790_000_000_000,
    updated_at: 1_790_000_000_000,
  });

  const answerFrontendApi = (url: URL) => {
    const [, , , , id, action] = url.pathname.split("/");
    const session = browserSessions.find((held) => held.id === id);

    if (url.pathname === "/v1/environment") {
      return Response.json({
        object: "environment",
        id: "env_anchor",
        auth_config: {},
        display_config: {},
        user_settings: {},
        organization_settings: { enabled: true },
      });
    }

    if (url.pathname === "/v1/client") {
      return Response.json({ response: getClientJson() });
    }

    if (session !== undefined && action === "tokens") {
      return Response.json({
        object: "token",
        jwt: mintSessionToken(session.userId, {
          sid: session.id,
          ...session.claims,
        }).token,
      });
    }

    if (session !== undefined && action === "touch") {
      return Response.json({
        response: getSessionJson(session),
        client: getClientJson(),
      });
    }

    return Response.json(
      { errors: [{ code: "resource_not_found" }] },
      { status: 404 },
    );
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const user = users.get(url.pathname.replace(/^\/v1\/users\//, ""));

    if (url.origin === `https://${FRONTEND_API}`) {
      return answerFrontendApi(url);
    }

    requests.push(url.href);

    if (failures.api) {
      return Response.json(
        { errors: [{ code: "internal_clerk_error", message: "Oops" }] },
        { status: 500 },
      );
    }

    if (url.origin !== "https://api.clerk.com" || user === undefined) {
      return Response.json(
        { errors: [{ code: "resource_not_found", message: "not found" }] },
        { status: 404 },
      );
    }

    return Response.json(getUserJson(user));
  });

  const sdk = createClerkClient({
    secretKey: SECRET_KEY,
    publishableKey: PUBLISHABLE_KEY,
    jwtKey: publicKey,
    telemetry: { disabled: true },
  });

  return {
    sdk,
    requests,
    failures,
    signUp: (name: string, claims: SessionClaims = {}, lifetime = 60) => {
      const userId = `user_${name}`;

      users.set(userId, { id: userId, name });

      const { token, issuedAt } = mintSessionToken(userId, claims, {
        lifetime,
      });

      return {
        userId,
        token,
        cookie: `__client_uat=${issuedAt}; __session=${token}`,
      };
    },
    // Signs a new user in on the Frontend API, for clerk-js to load its session.
    signInBrowser: (name: string, claims: SessionClaims = {}) => {
      const userId = `user_${name}`;

      users.set(userId, { id: userId, name });
      browserSessions.push({ id: `sess_${userId}`, userId, claims });

      return { userId };
    },
  };
};
