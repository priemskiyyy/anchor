import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  MSAL_ENVIRONMENT,
  MSAL_TENANT,
  OTHER_TENANT,
  createFakePublicClientApplication,
} from "src/fakePublicClientApplication.fixture";
import { msal } from "src/msal";

const create = (
  options: Parameters<typeof createFakePublicClientApplication>[0] = {},
) => {
  const fake = createFakePublicClientApplication(options);

  const anchor = new Anchor({
    adapter: msal({
      sdk: fake.sdk,
      tokens: {
        graph: accessToken({ scopes: ["User.Read"] }),
        api: accessToken({
          scopes: ["api://anchor/read", "api://anchor/write"],
        }),
      },
    }),
  });

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

const getSubject = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => (state.status === "signed-in" ? state.session.principal.subject : null);

const countReads = (events: AnchorDiagnosticType[]) =>
  events.filter((type) => type === "read started").length;

const flushMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
};

test("creating the adapter reads, registers and calls nothing on the client", () => {
  const fake = createFakePublicClientApplication();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = msal({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("msal");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("the active account is the session: its environment, home account id and tenant name the principal, and its fields are the user", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { name: "Ada Lovelace" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: MSAL_ENVIRONMENT,
    subject: "ada",
    tenant: MSAL_TENANT,
  });
  expect(session.user).toEqual({
    homeAccountId: "ada",
    environment: MSAL_ENVIRONMENT,
    tenantId: MSAL_TENANT,
    username: "ada@contoso.example",
    localAccountId: "local.ada",
    name: "Ada Lovelace",
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("an MSAL that caches accounts but holds none active is signed out, never answering the first cached one", async () => {
  const { fake, anchor } = create();

  fake.login("ada");

  const grace = fake.login("grace");

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  fake.sdk.setActiveAccount(grace);

  await expect.poll(() => getSubject(anchor.session.get())).toBe("grace");
});

test("every read waits for the promise initialize() answered, so an MSAL still loading its cache is initializing, never signed out", async () => {
  const fake = createFakePublicClientApplication({ initialized: false });
  const statuses: string[] = [];

  let finishInitialize = () => {};

  const initialized = new Promise<void>((resolve) => {
    finishInitialize = resolve;
  });

  const anchor = new Anchor({
    adapter: msal({ sdk: fake.sdk, initialized }),
  });

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  fake.signIn("ada");

  const started = anchor.start();

  await flushMicrotasks();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  await fake.sdk.initialize();
  finishInitialize();
  await started;

  expect(statuses).toEqual(["signed-in"]);
  expect(getSubject(anchor.session.get())).toBe("ada");
});

test("without initialized, a read before MSAL loaded its cache fails instead of signing out, and initializeEnd reads again", async () => {
  const { fake, anchor } = create({ initialized: false });

  fake.signIn("ada");
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: { errorCode: "uninitialized_public_client_application" },
    },
  });

  await fake.sdk.initialize();

  await expect.poll(() => getSubject(anchor.session.get())).toBe("ada");
});

test("an initialize() that fails makes the first state unavailable, never signed out", async () => {
  const fake = createFakePublicClientApplication();
  const failure = new Error("crypto_nonexistent");

  const anchor = new Anchor({
    adapter: msal({ sdk: fake.sdk, initialized: Promise.reject(failure) }),
  });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("setting, changing and clearing the active account reach the session through activeAccountChanged", async () => {
  const { fake, anchor } = create();

  await anchor.start();
  fake.signIn("ada");

  await expect.poll(() => getSubject(anchor.session.get())).toBe("ada");

  const ada = getSignedInSession(anchor.session.get());

  fake.sdk.setActiveAccount(fake.login("grace"));

  await expect.poll(() => getSubject(anchor.session.get())).toBe("grace");
  expect(getSignedInSession(anchor.session.get()).key).not.toBe(ada.key);

  fake.sdk.setActiveAccount(null);

  await expect.poll(() => anchor.session.get().status).toBe("signed-out");
});

test("MSAL loading its cache, a login and a token acquisition each ask for a read, and MSAL's other events do not", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  const reads = countReads(events);

  fake.emit("msal:initializeStart");
  fake.emit("msal:acquireTokenStart");
  fake.emit("msal:acquireTokenFailure");
  fake.emit("msal:logoutSuccess");
  await flushMicrotasks();

  expect(countReads(events)).toBe(reads);

  fake.emit("msal:initializeEnd");
  await expect.poll(() => countReads(events)).toBe(reads + 1);

  fake.emit("msal:loginSuccess");
  await expect.poll(() => countReads(events)).toBe(reads + 2);

  fake.emit("msal:acquireTokenSuccess");
  await expect.poll(() => countReads(events)).toBe(reads + 3);
});

test("the same account in another tenant, or signed in again with another sid, is a new session, and a refresh keeps the key", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { sid: "sid_a" });
  await anchor.start();

  const home = getSignedInSession(anchor.session.get());

  fake.signIn("ada", { tenantId: OTHER_TENANT, sid: "sid_a" });

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).principal.tenant)
    .toBe(OTHER_TENANT);

  const guest = getSignedInSession(anchor.session.get());

  fake.signIn("ada", { tenantId: OTHER_TENANT, sid: "sid_b" });

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(guest.key);

  const relogged = getSignedInSession(anchor.session.get());

  await relogged.getToken("graph", { forceRefresh: true });
  await flushMicrotasks();

  expect(new Set([home.key, guest.key, relogged.key]).size).toBe(3);
  expect(getSignedInSession(anchor.session.get()).key).toBe(relogged.key);
});

test("a mapper receives MSAL's account and its result is the session's user", async () => {
  const fake = createFakePublicClientApplication();

  const anchor = new Anchor({
    adapter: msal({
      sdk: fake.sdk,
      user: (account) => ({
        id: account.homeAccountId,
        sid: account.idTokenClaims?.sid,
      }),
    }),
  });

  fake.signIn("ada", { sid: "sid_a" });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    sid: "sid_a",
  });
});

test("each profile mints for its own scopes through acquireTokenSilent bound to the session's account, from MSAL's cache unless forced", async () => {
  const { fake, anchor } = create();
  const ada = fake.signIn("ada");

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("graph")).resolves.toEqual({
    value: "access.ada.User.Read.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(session.getToken("graph")).resolves.toMatchObject({
    value: "access.ada.User.Read.1",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({
    value: "access.ada.api://anchor/read api://anchor/write.2",
  });
  expect(fake.silentRequests).toEqual([
    { scopes: ["User.Read"], account: ada, forceRefresh: false },
    { scopes: ["User.Read"], account: ada, forceRefresh: false },
    {
      scopes: ["api://anchor/read", "api://anchor/write"],
      account: ada,
      forceRefresh: true,
    },
  ]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a token asked for an account MSAL no longer holds as active is refused before MSAL is asked", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(
    ada.getToken("graph", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.silentRequests).toEqual([]);
});

test("an InteractionRequiredAuthError rejects with INTERACTION_REQUIRED and its cause, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const mfa = Object.assign(new Error("interaction_required: AADSTS50076"), {
    name: "InteractionRequiredAuthError",
    errorCode: "interaction_required",
  });

  fake.failures.token = mfa;

  await expect(session.getToken("graph")).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: mfa,
  });

  const timeout = Object.assign(new Error("monitor_window_timeout"), {
    name: "BrowserAuthError",
    errorCode: "monitor_window_timeout",
  });

  fake.failures.token = timeout;

  await expect(session.getToken("graph")).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: timeout,
  });
});

test("ending clears only the session's account from MSAL's cache, never every account, and answers the Entra session unknown with no page", async () => {
  const { fake, anchor } = create();
  const ada = fake.signIn("ada");

  fake.login("grace");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.clearedAccounts).toEqual([ada]);
  expect(
    fake.sdk.getAllAccounts().map(({ homeAccountId }) => homeAccountId),
  ).toEqual(["grace"]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending an account MSAL no longer holds as active clears nothing", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.clearedAccounts).toEqual([]);
  expect(fake.sdk.getActiveAccount()?.homeAccountId).toBe("grace");
});

test("outside a browser MSAL registers no callback, so the session is read on sync and dispose removes nothing", async () => {
  const { fake, anchor } = create({ browser: false });

  await anchor.start();
  fake.signIn("ada");

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(getSubject(anchor.session.get())).toBe("ada");

  anchor.dispose();

  expect(fake.removals).toEqual([]);
});

test("dispose removes exactly the adapter's callback, and the application's own keeps hearing MSAL", async () => {
  const { fake, anchor } = create();
  const heard: string[] = [];

  fake.sdk.addEventCallback(
    () => heard.push("activeAccountChanged"),
    ["msal:activeAccountChanged"],
  );
  await anchor.start();

  expect(fake.listeners()).toBe(2);

  anchor.dispose();

  expect(fake.removals).toEqual(["callback-2"]);
  expect(fake.listeners()).toBe(1);

  fake.signIn("ada");

  expect(heard).toEqual(["activeAccountChanged"]);
});

test.each([
  ["an environment", { environment: "" }],
  ["a home account id", { homeAccountId: "" }],
])(
  "an account without %s is outside the contract, so the first state is unavailable",
  async (_missing, fields) => {
    const fake = createFakePublicClientApplication();

    const account = {
      homeAccountId: "ada",
      environment: MSAL_ENVIRONMENT,
      tenantId: MSAL_TENANT,
      localAccountId: "local.ada",
      username: "ada@contoso.example",
      ...fields,
    };

    const anchor = new Anchor({
      adapter: msal({
        sdk: { ...fake.sdk, getActiveAccount: () => account },
      }),
    });

    await anchor.start();

    expect(anchor.session.get()).toMatchObject({
      status: "unavailable",
      error: { code: "INVALID_ANSWER" },
    });
  },
);
