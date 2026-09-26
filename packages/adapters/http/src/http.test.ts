import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { expect, test, vi } from "vitest";

import { createFakeBackend } from "src/fakeBackend.fixture";
import { http } from "src/http";

const AUTHORITY = "https://api.example.com";

const create = () => {
  const backend = createFakeBackend();

  const anchor = new Anchor({
    adapter: http({
      authority: AUTHORITY,
      read: backend.client.getSession,
      end: backend.client.endSession,
      tokens: { api: backend.client.mintToken },
    }),
  });

  return { backend, anchor };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("creating the adapter calls nothing, and there is no SDK behind it", () => {
  const read = vi.fn(async () => null);
  const end = vi.fn(async () => {});
  const mint = vi.fn(async () => ({ value: "token", subject: "user_ada" }));

  const adapter = http({
    authority: AUTHORITY,
    read,
    end,
    tokens: { api: mint },
  });

  expect(adapter.name).toBe("http");
  expect(adapter.native).toBe(null);
  expect(Object.keys(adapter.tokens)).toEqual(["api"]);
  expect(read).not.toHaveBeenCalled();
  expect(end).not.toHaveBeenCalled();
  expect(mint).not.toHaveBeenCalled();
});

test("the first state is the server's answer, as a session of its subject under the backend's authority", async () => {
  const { backend, anchor } = create();

  backend.signIn("user_ada", "org_acme");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: AUTHORITY,
    subject: "user_ada",
    tenant: null,
  });
  expect(session.user).toEqual({ id: "user_ada", name: "USER_ADA" });
  expect(backend.reads).toEqual([{ signal: expect.any(AbortSignal) }]);
});

test("the adapter observes nothing, so a sign-in and a sign-out are seen once the application syncs", async () => {
  const { backend, anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  backend.signIn("user_ada");

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );

  backend.signOut();
  await anchor.sync();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("the same user with another context is a new session", async () => {
  const { backend, anchor } = create();

  backend.signIn("user_ada", "org_acme");
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  backend.signIn("user_ada", "org_globex");
  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(acme.key);
});

test("a read that throws cannot tell the session, so the first state is unavailable, never signed-out", async () => {
  const { backend, anchor } = create();
  const failure = new Error("The session endpoint answered 503.");

  backend.failures.read = failure;
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("an answer outside the contract, such as unvalidated JSON without a subject, is refused as INVALID_ANSWER", async () => {
  const anchor = new Anchor({
    adapter: http({
      authority: AUTHORITY,
      read: async () => JSON.parse('{ "user": { "name": "Ada" } }'),
    }),
  });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});

test("an answer with a step to finish requires that action", async () => {
  const anchor = new Anchor({
    adapter: http({
      authority: AUTHORITY,
      read: () => ({
        subject: "user_ada",
        user: null,
        action: { kind: "accept-terms" },
      }),
    }),
  });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "action-required",
    action: { kind: "accept-terms" },
  });
});

test("a token is minted by its profile's function with the session's identity, the forced refresh and a signal", async () => {
  const { backend, anchor } = create();

  backend.signIn("user_ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toEqual({
    value: "api.user_ada.1",
    kind: "access-token",
    scheme: null,
  });
  expect(backend.mints).toEqual([
    {
      profile: "api",
      forceRefresh: true,
      session: {
        principal: session.principal,
        context: '[null,"session_1"]',
      },
      signal: expect.any(AbortSignal),
    },
  ]);
});

test("a token the server minted for whoever is signed in now, not the session that asked, is refused as SESSION_CHANGED", async () => {
  const { backend, anchor } = create();

  backend.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  backend.signIn("user_grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
});

test("a mint that throws rejects with TOKEN_FAILED and the error as its cause", async () => {
  const { backend, anchor } = create();
  const failure = new Error("The token endpoint answered 500.");

  backend.signIn("user_ada");
  await anchor.start();
  backend.failures.mint = failure;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: failure });
});

test("ending hands the server the session's identity, and a resolved end is completed and signed out at once", async () => {
  const { backend, anchor } = create();

  backend.signIn("user_ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.end()).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(backend.ends).toEqual([
    {
      session: {
        principal: session.principal,
        context: '[null,"session_1"]',
      },
      signal: expect.any(AbortSignal),
    },
  ]);
  expect(backend.current()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("an end that rejects is END_FAILED, and the session stays", async () => {
  const { backend, anchor } = create();
  const failure = new Error("The logout endpoint answered 503.");

  backend.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  backend.failures.end = failure;

  await expect(ada.end()).rejects.toMatchObject({
    code: "END_FAILED",
    cause: failure,
  });
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("without end, ending is UNSUPPORTED, and without tokens, the adapter declares no profile", async () => {
  const backend = createFakeBackend();

  const adapter = http({
    authority: AUTHORITY,
    read: backend.client.getSession,
  });

  const anchor = new Anchor({ adapter });

  backend.signIn("user_ada");
  await anchor.start();

  expect(adapter.tokens).toEqual({});
  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({
    code: "UNSUPPORTED",
  });
});
