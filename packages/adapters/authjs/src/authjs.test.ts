// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { afterEach, expect, test, vi } from "vitest";

import { authjs } from "src/authjs";
import {
  countStorageListeners,
  createFakeNextAuthReact,
} from "src/fakeNextAuthReact.fixture";

afterEach(() => {
  vi.unstubAllGlobals();
});

const create = () => {
  const fake = createFakeNextAuthReact();
  const anchor = new Anchor({ adapter: authjs({ sdk: fake.sdk }) });
  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  return { fake, anchor, events };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("creating the adapter reads and calls nothing on the client and listens to nothing", () => {
  const fake = createFakeNextAuthReact();
  const listeners = countStorageListeners();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = authjs({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("authjs");
  expect(adapter.tokens).toEqual({});
  expect(listeners()).toBe(0);
});

test("the server's session is a session of the user id its session callback added, whose user is a snapshot of the session's user", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "authjs",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
  expect(session.user).toEqual({
    id: "user_ada",
    name: "USER_ADA",
    email: "user_ada@example.com",
    image: null,
  });
});

test("a session without the user id is refused as outside the contract, never guessed from its email", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { withoutId: true });
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});

test("no session on the server is signed out, and every read asks the session endpoint itself, never broadcasting to the other tabs", async () => {
  const { fake, anchor } = create();

  await anchor.start();
  await anchor.sync();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(fake.endpointRequests).toEqual([
    "/api/auth/session",
    "/api/auth/session",
  ]);
  expect(fake.sessionRequests).toEqual([]);
  expect(fake.broadcasts).toEqual([]);
});

test("a custom basePath is where the session is read", async () => {
  const fake = createFakeNextAuthReact();

  const anchor = new Anchor({
    adapter: authjs({ sdk: fake.sdk, basePath: "/auth" }),
  });

  await anchor.start();

  expect(fake.endpointRequests).toEqual(["/auth/session"]);
});

test("a sign-in or a sign-out another tab broadcasts is read at once", async () => {
  const { fake, anchor } = create();

  await anchor.start();
  fake.signInElsewhere("user_ada");

  await expect
    .poll(() => {
      const state = anchor.session.get();

      return state.status === "signed-in"
        ? state.session.principal.subject
        : null;
    })
    .toBe("user_ada");

  fake.signOutElsewhere();

  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });
});

test("a change in this tab is heard only on the next read, since next-auth tells only the other tabs", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  const reads = events.filter((type) => type === "read started").length;

  fake.signIn("user_ada");
  await Promise.resolve();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(events.filter((type) => type === "read started").length).toBe(reads);

  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );
});

test("a session request that failed is no evidence of signing out: the first state is unavailable, and later the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  fake.failures.network = true;
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });

  fake.failures.network = false;
  await anchor.sync();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.status = 503;

  await expect(anchor.sync()).rejects.toMatchObject({ code: "READ_FAILED" });
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("a mapper receives the whole session and its result is the session's user", async () => {
  const fake = createFakeNextAuthReact();

  const anchor = new Anchor({
    adapter: authjs({
      sdk: fake.sdk,
      user: (session) => ({ id: session.user?.id, email: session.user?.email }),
    }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "user_ada",
    email: "user_ada@example.com",
  });
});

test("ending signs the session out without a redirect, and the state is signed-out at once", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.signOuts).toEqual([{ redirect: false }]);
  expect(fake.session()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session the server no longer holds signs nobody out", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.signIn("user_grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.session()?.user?.id).toBe("user_grace");
});

test("a sign-out the server refused rejects with END_FAILED, and the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.csrf = true;

  await expect(ada.end()).rejects.toMatchObject({ code: "END_FAILED" });
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("dispose removes the storage listener, and a broadcast after it reads nothing", async () => {
  const { fake, anchor, events } = create();
  const listeners = countStorageListeners();

  await anchor.start();

  expect(listeners()).toBe(1);

  anchor.dispose();

  expect(listeners()).toBe(0);

  const reads = events.filter((type) => type === "read started").length;

  fake.signInElsewhere("user_ada");

  expect(events.filter((type) => type === "read started").length).toBe(reads);
});
