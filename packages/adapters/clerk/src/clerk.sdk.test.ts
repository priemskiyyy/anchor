// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { Clerk } from "@clerk/clerk-js";
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";

import { clerk } from "src/clerk";
import { sessionToken } from "src/sessionToken";

const PUBLISHABLE_KEY = `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`;

type SessionJson = Record<string, unknown> & {
  id: string;
  last_active_token: { object: "token"; jwt: string };
};

type FrontendApiCall = { method: string; path: string; body: string };

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createJwt = (claims: object) => {
  const issuedAt = Math.floor(Date.now() / 1000);

  return [
    encodeSegment({ alg: "RS256", typ: "JWT", kid: "ins_anchor" }),
    encodeSegment({
      iss: "https://clerk.example.com",
      iat: issuedAt,
      nbf: issuedAt - 5,
      exp: issuedAt + 3600,
      ...claims,
    }),
    encodeSegment({ signature: "unverified" }),
  ].join(".");
};

// Every test gets sessions of its own, since clerk-js caches tokens by session id for the whole page.
const createSessionJson = (
  subject: string,
  fields: Record<string, unknown> = {},
): SessionJson => {
  const id = `sess_real_${randomUUID()}`;

  return {
    object: "session",
    id,
    status: "active",
    expire_at: Date.now() + 86_400_000,
    abandon_at: Date.now() + 86_400_000,
    last_active_at: Date.now(),
    last_active_organization_id: null,
    actor: null,
    tasks: null,
    user: {
      object: "user",
      id: subject,
      username: subject,
      first_name: "Ada",
      last_name: "Lovelace",
      image_url: `https://img.clerk.com/${subject}`,
      has_image: true,
      primary_email_address_id: "idn_email",
      email_addresses: [
        {
          object: "email_address",
          id: "idn_email",
          email_address: `${subject}@example.com`,
          verification: null,
          linked_to: [],
        },
      ],
      phone_numbers: [],
      web3_wallets: [],
      external_accounts: [],
      organization_memberships: [],
      created_at: 1_700_000_000_000,
      updated_at: 1_700_000_000_000,
    },
    public_user_data: { identifier: `${subject}@example.com` },
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    last_active_token: {
      object: "token",
      jwt: createJwt({ sub: subject, sid: id }),
    },
    ...fields,
  };
};

const respond = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// The Frontend API is answered in-process, so the real clerk-js runs every request it makes without a network.
const answerFrontendApi = (initial: SessionJson[]) => {
  const calls: FrontendApiCall[] = [];

  const client = {
    object: "client",
    id: "client_anchor",
    sessions: initial,
    last_active_session_id: initial.at(-1)?.id ?? null,
    sign_in: null,
    sign_up: null,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const method = url.searchParams.get("_method") ?? init?.method ?? "GET";
    const [, , , , id, action] = url.pathname.split("/");

    calls.push({ method, path: url.pathname, body: String(init?.body ?? "") });

    if (url.pathname === "/v1/environment") {
      return respond({
        object: "environment",
        id: "env_anchor",
        auth_config: {},
        display_config: {},
        user_settings: {},
        organization_settings: { enabled: true },
      });
    }

    if (url.pathname === "/v1/client") {
      return respond({ response: client });
    }

    const session = client.sessions.find((held) => held.id === id);

    if (session !== undefined && action === "tokens") {
      return respond({
        object: "token",
        jwt: createJwt({
          sub: "user_ada",
          sid: session.id,
          path: url.pathname,
        }),
      });
    }

    if (session !== undefined && action === "touch") {
      const organization = new URLSearchParams(String(init?.body)).get(
        "active_organization_id",
      );

      Object.assign(session, { last_active_organization_id: organization });

      return respond({ response: session, client });
    }

    if (session !== undefined && action === "remove") {
      client.sessions = client.sessions.filter((held) => held !== session);

      return respond({ response: { ...session, status: "removed" }, client });
    }

    if (url.pathname === "/v1/client/sessions" && method === "DELETE") {
      client.sessions = [];

      return respond({ response: client, client });
    }

    return respond({ errors: [{ code: "resource_not_found" }] }, 404);
  });

  return calls;
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real Clerk, loaded headless as Clerk Expo loads it, holds Anchor at initializing until load() finishes, then maps its session, organization and actor", async () => {
  const ada = createSessionJson("user_ada", {
    last_active_organization_id: "org_acme",
    actor: { sub: "user_support" },
  });

  answerFrontendApi([ada]);

  const instance = new Clerk(PUBLISHABLE_KEY);
  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });
  const started = anchor.start();

  await Promise.resolve();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  await instance.load({ standardBrowser: false });
  await started;

  const session = getSignedInSession(anchor.session.get());

  expect(anchor.native).toBe(instance);
  expect(session.principal).toEqual({
    authority: "https://clerk.example.com",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.impersonated).toBe(true);
  expect(session.user).toEqual({
    id: "user_ada",
    externalId: null,
    username: "user_ada",
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    imageUrl: "https://img.clerk.com/user_ada",
    primaryEmailAddress: "user_ada@example.com",
    primaryPhoneNumber: null,
  });

  anchor.dispose();
});

test("an organization switch through the real setActive() reaches Anchor as a new session", async () => {
  answerFrontendApi([createSessionJson("user_ada")]);

  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });

  await anchor.start();

  const personal = getSignedInSession(anchor.session.get());

  await instance.setActive({ organization: "org_acme" });

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(personal.key);
  expect(instance.session?.lastActiveOrganizationId).toBe("org_acme");

  anchor.dispose();
});

test("a pending session of the real Clerk is action-required under the name of its task", async () => {
  answerFrontendApi([
    createSessionJson("user_ada", {
      status: "pending",
      tasks: [{ key: "choose-organization" }],
    }),
  ]);

  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "action-required",
    action: { kind: "choose-organization" },
  });

  anchor.dispose();
});

test("the real getToken() answers the cached session token, fetches one when forced, and fetches a JWT template's token", async () => {
  const ada = createSessionJson("user_ada");
  const calls = answerFrontendApi([ada]);
  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({
    adapter: clerk({
      sdk: instance,
      tokens: {
        api: sessionToken(),
        supabase: sessionToken({ template: "supabase" }),
      },
    }),
  });

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: ada.last_active_token.jwt,
    kind: "session-token",
    scheme: "Bearer",
  });
  expect(
    calls.flatMap(({ path }) => (path.includes("/tokens") ? [path] : [])),
  ).toEqual([]);

  await session.getToken("api", { forceRefresh: true });
  await session.getToken("supabase");

  expect(
    calls.flatMap(({ method, path }) =>
      path.includes("/tokens") ? [`${method} ${path}`] : [],
    ),
  ).toEqual([
    `POST /v1/client/sessions/${ada.id}/tokens`,
    `POST /v1/client/sessions/${ada.id}/tokens/supabase`,
  ]);

  anchor.dispose();
});

test("ending removes exactly this session through the real Frontend API, never navigating", async () => {
  const ada = createSessionJson("user_ada");
  const calls = answerFrontendApi([ada]);
  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });
  const page = location.href;

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "completed", navigation: null },
  );
  expect(calls.at(-1)).toMatchObject({
    method: "DELETE",
    path: "/v1/client/sessions",
  });
  expect(instance.session).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(location.href).toBe(page);

  anchor.dispose();
});

test("in a real multi-session client, ending removes only the active session", async () => {
  const grace = createSessionJson("user_grace");
  const ada = createSessionJson("user_ada");
  const calls = answerFrontendApi([grace, ada]);
  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "completed", navigation: null },
  );
  expect(calls.at(-1)).toMatchObject({
    method: "POST",
    path: `/v1/client/sessions/${ada.id}/remove`,
  });
  expect(instance.client?.signedInSessions.map(({ id }) => id)).toEqual([
    grace.id,
  ]);

  anchor.dispose();
});

test("offline, the real clerk-js answers a sign-out it could not send: the session ended here and Clerk's side is unknown", async () => {
  answerFrontendApi([createSessionJson("user_ada")]);

  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({ adapter: clerk({ sdk: instance }) });

  await anchor.start();

  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new TypeError("Failed to fetch"),
  );

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(instance.client?.signedInSessions).toHaveLength(1);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("the real Clerk's emissions reach the adapter until dispose removes its listener", async () => {
  answerFrontendApi([createSessionJson("user_ada")]);

  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = clerk({ sdk: instance }).open(observer);

  expect(observer.session.mock.calls).toEqual([
    [expect.objectContaining({ status: "signed-in" })],
  ]);

  await session.dispose?.();
  await instance.setActive({ organization: "org_acme" });

  expect(instance.session?.lastActiveOrganizationId).toBe("org_acme");
  expect(observer.session.mock.calls).toHaveLength(1);
  expect(observer.invalidate.mock.calls).toEqual([]);
});
