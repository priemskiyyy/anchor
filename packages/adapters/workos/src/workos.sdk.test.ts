// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { createClient } from "@workos-inc/authkit-js";
import { afterEach, expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { workos } from "src/workos";
import { workosRefreshes } from "src/workosRefreshes";

type WorkosCall = {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  mode: string | null;
};

type WorkosAnswers = { refresh: "renew" | "refuse" | "fail" };

const CLIENT_ID = "client_anchor";

// AuthKit reads only exp - iat from a token, so one issue time keeps every token of a test predictable.
const ISSUED_AT = Math.floor(Date.now() / 1000);

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createAccessToken = (organization: string | undefined, issued: number) =>
  [
    encodeSegment({ alg: "RS256", typ: "JWT" }),
    encodeSegment({
      iss: `https://api.workos.com/user_management/${CLIENT_ID}`,
      sub: "user_ada",
      sid: "session_ada",
      jti: `jti_${issued}`,
      org_id: organization,
      iat: ISSUED_AT,
      exp: ISSUED_AT + 300,
    }),
    encodeSegment({ signature: "unverified" }),
  ].join(".");

// WorkOS is answered in-process, so the real authkit-js runs its code exchange, refreshes and logout without a network.
const answerWorkos = (answers: WorkosAnswers = { refresh: "renew" }) => {
  const calls: WorkosCall[] = [];
  let issued = 0;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));

    const body: Record<string, unknown> | null =
      init?.body === undefined ? null : JSON.parse(String(init.body));

    calls.push({
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      body,
      mode: init?.mode ?? null,
    });

    if (url.pathname !== "/user_management/authenticate") {
      return new Response(null, { status: 200 });
    }

    if (body?.grant_type === "refresh_token" && answers.refresh === "fail") {
      throw new TypeError("Failed to fetch");
    }

    if (
      body?.grant_type === "refresh_token" &&
      (answers.refresh === "refuse" || body.refresh_token === undefined)
    ) {
      return Response.json(
        { error: "invalid_grant", error_description: "Invalid refresh token." },
        { status: 400 },
      );
    }

    issued += 1;

    const organization =
      typeof body?.organization_id === "string"
        ? body.organization_id
        : "org_acme";

    return Response.json({
      user: {
        object: "user",
        id: "user_ada",
        email: "ada@example.com",
        email_verified: true,
        first_name: "Ada",
        last_name: "Lovelace",
        profile_picture_url: null,
        last_sign_in_at: "2026-09-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      organization_id: organization,
      access_token: createAccessToken(organization, issued),
      refresh_token: `refresh_${issued}`,
      authentication_method: "Password",
    });
  });

  return calls;
};

// The page AuthKit redirects back to after a sign-in, with the code and the verifier the sign-in stored.
const returnFromSignIn = () => {
  sessionStorage.setItem("workos:code-verifier", "verifier_anchor");
  history.replaceState({}, "", "/callback?code=code_anchor");
};

const createAuthKit = async () => {
  const refreshes = workosRefreshes();

  const client = await createClient(CLIENT_ID, {
    redirectUri: "http://localhost:3000/callback",
    onRefresh: refreshes.handleRefresh,
    onRefreshFailure: refreshes.handleRefreshFailure,
  });

  return { client, refreshes };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

const clients: Array<{ dispose: () => void }> = [];

afterEach(() => {
  for (const client of clients.splice(0)) {
    client.dispose();
  }

  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "/");
});

test("the real AuthKit client, signed in through its redirect callback, is a session of its user in the organization its onRefresh reported", async () => {
  answerWorkos();
  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({ adapter: workos({ sdk: client, refreshes }) });

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(anchor.native).toBe(client);
  expect(session.principal).toEqual({
    authority: "workos",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.impersonated).toBe(false);
  expect(session.user).toEqual({
    id: "user_ada",
    email: "ada@example.com",
    emailVerified: true,
    firstName: "Ada",
    lastName: "Lovelace",
    profilePictureUrl: null,
    externalId: null,
  });
  expect(refreshes.getLatestRefresh()).toEqual({
    organizationId: "org_acme",
    impersonator: null,
  });

  anchor.dispose();
});

test("an organization switch through the real switchToOrganization() reaches Anchor as a new session", async () => {
  const calls = answerWorkos();

  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({ adapter: workos({ sdk: client, refreshes }) });

  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  await client.switchToOrganization({ organizationId: "org_globex" });

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(acme.key);
  expect(calls.at(-1)?.body).toMatchObject({
    grant_type: "refresh_token",
    organization_id: "org_globex",
  });

  anchor.dispose();
});

test("the real getAccessToken() answers the stored token, and a forced one refreshes it through the refresh token", async () => {
  const calls = answerWorkos();

  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({
    adapter: workos({ sdk: client, refreshes, tokens: { api: accessToken() } }),
  });

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: createAccessToken("org_acme", 1),
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: createAccessToken("org_acme", 2) });
  expect(
    calls.flatMap(({ body }) =>
      typeof body?.grant_type === "string" ? [body.grant_type] : [],
    ),
  ).toEqual(["authorization_code", "refresh_token"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a visitor the real AuthKit holds no session for is signed out once WorkOS refused the refresh it tried", async () => {
  const calls = answerWorkos();
  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({ adapter: workos({ sdk: client, refreshes }) });

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(calls).toEqual([
    {
      method: "POST",
      path: "/user_management/authenticate",
      body: { client_id: CLIENT_ID, grant_type: "refresh_token" },
      mode: null,
    },
  ]);

  anchor.dispose();
});

test("a first refresh the network failed leaves the real AuthKit without a user, which is no evidence of signing out", async () => {
  const answers: WorkosAnswers = { refresh: "fail" };

  answerWorkos(answers);
  localStorage.setItem(`workos:refresh-token:${CLIENT_ID}`, "refresh_stored");

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({ adapter: workos({ sdk: client, refreshes }) });

  await anchor.start();

  expect(client.getUser()).toBe(null);
  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: expect.any(TypeError) },
  });

  answers.refresh = "renew";
  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );

  anchor.dispose();
});

test("a refresh the real WorkOS refuses clears AuthKit's session through onRefreshFailure, and the session is signed out", async () => {
  const answers: WorkosAnswers = { refresh: "renew" };

  answerWorkos(answers);
  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({
    adapter: workos({ sdk: client, refreshes, tokens: { api: accessToken() } }),
  });

  await anchor.start();
  answers.refresh = "refuse";

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(client.getUser()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("ending signs the real AuthKit out without navigating: the logout request goes out without cors and AuthKit holds no user", async () => {
  const calls = answerWorkos();

  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const anchor = new Anchor({ adapter: workos({ sdk: client, refreshes }) });
  const page = location.href;

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(calls.at(-1)).toEqual({
    method: "GET",
    path: "/user_management/sessions/logout?session_id=session_ada",
    body: null,
    mode: "no-cors",
  });
  expect(client.getUser()).toBe(null);
  expect(location.href).toBe(page);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("the real client's refreshes reach the adapter until dispose unsubscribes it", async () => {
  answerWorkos();
  returnFromSignIn();

  const { client, refreshes } = await createAuthKit();

  clients.push(client);

  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = workos({ sdk: client, refreshes }).open(observer);

  await client.getAccessToken({ forceRefresh: true });

  expect(observer.invalidate.mock.calls).toEqual([[]]);

  await session.dispose?.();
  await client.getAccessToken({ forceRefresh: true });

  expect(observer.invalidate.mock.calls).toEqual([[]]);
  expect(observer.session.mock.calls).toEqual([]);
});
