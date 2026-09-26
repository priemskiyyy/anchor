import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  KEYCLOAK_ISSUER,
  LOGOUT_ENDPOINT,
  createFakeKeycloak,
} from "src/fakeKeycloak.fixture";
import { keycloak } from "src/keycloak";

const create = (options: Parameters<typeof createFakeKeycloak>[0] = {}) => {
  const fake = createFakeKeycloak(options);

  const anchor = new Anchor({
    adapter: keycloak({
      sdk: fake.sdk,
      ...(options.initialized === false
        ? {}
        : { initialized: fake.initialized }),
      tokens: { api: accessToken() },
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

const flushMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
};

test("creating the adapter reads, chains and calls nothing on the instance", () => {
  const fake = createFakeKeycloak();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = keycloak({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("keycloak");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("the first read waits for init() to finish, so an instance not yet initialized is initializing, never signed out", async () => {
  const { fake, anchor, events } = create({ initialized: false });
  const started = anchor.start();

  await flushMicrotasks();

  expect(anchor.session.get()).toEqual({ status: "initializing" });
  expect(events).not.toContain("read completed");

  fake.init("ada");
  await started;

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );
  await expect
    .poll(() =>
      events.flatMap((type) =>
        type === "read completed" || type === "read superseded" ? [type] : [],
      ),
    )
    .toEqual(["read superseded"]);
});

test("an Anchor started while init() runs waits for the promise init() returned, so it is never signed out before keycloak-js found the session", async () => {
  const fake = createFakeKeycloak();
  const statuses: string[] = [];

  let finishInit = () => {};

  const initialized = new Promise<void>((resolve) => {
    finishInit = resolve;
  });

  const anchor = new Anchor({
    adapter: keycloak({ sdk: fake.sdk, initialized }),
  });

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));

  const started = anchor.start();

  await flushMicrotasks();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  fake.login("ada");
  finishInit();
  await started;

  expect(statuses).toEqual(["signed-in"]);
});

test("an instance whose init() was already called cannot start without the promise init() returned, and chains nothing", async () => {
  const fake = createFakeKeycloak();

  const anchor = new Anchor({ adapter: keycloak({ sdk: fake.sdk }) });

  await expect(anchor.start()).rejects.toMatchObject({
    code: "START_FAILED",
    cause: {
      code: "INVALID_CONFIGURATION",
      message:
        "keycloak-js's init() was already called: pass the promise it returned as `initialized`.",
    },
  });
  expect(fake.listeners()).toBe(0);
});

test("an init() that fails makes the first state unavailable, never signed out", async () => {
  const fake = createFakeKeycloak();

  const failure = new Error(
    "Timeout when waiting for 3rd party check iframe message.",
  );

  const anchor = new Anchor({
    adapter: keycloak({ sdk: fake.sdk, initialized: Promise.reject(failure) }),
  });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("an init() that finds no session is signed out once onReady reports it", async () => {
  const { fake, anchor } = create({ initialized: false });
  const started = anchor.start();

  fake.init(null);
  await started;

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("an initialized instance is read at once: its access token is a session of the realm's issuer and the subject, whose user is a snapshot of the profile claims", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: KEYCLOAK_ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "ada",
    name: "ADA",
    preferred_username: "ada",
    given_name: null,
    family_name: null,
    email: "ada@example.com",
    email_verified: true,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("the same user in another organization or another Keycloak session is a new session, and a refresh keeps the key", async () => {
  const { fake, anchor } = create();

  fake.login("ada", { sid: "sid_a" });
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  fake.login("ada", { sid: "sid_a", organization: ["acme"] });

  const acme = getSignedInSession(anchor.session.get());

  fake.login("ada", { sid: "sid_b", organization: ["acme"] });

  const relogged = getSignedInSession(anchor.session.get());

  await relogged.getToken("api", { forceRefresh: true });

  expect(new Set([first.key, acme.key, relogged.key]).size).toBe(3);
  expect(getSignedInSession(anchor.session.get()).key).toBe(relogged.key);
});

test("a refresh that carries new profile claims updates the user and keeps the key", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.renameOnRefresh("Ada Lovelace");
  await ada.getToken("api", { forceRefresh: true });

  const renamed = getSignedInSession(anchor.session.get());

  expect(renamed.key).toBe(ada.key);
  expect(renamed.user).toMatchObject({ name: "Ada Lovelace" });
});

test("a login, a refresh and a logout are pushed through the callbacks, without a read", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  const reads = events.filter((type) => type === "read started").length;

  fake.login("ada");

  const ada = getSignedInSession(anchor.session.get());

  await ada.getToken("api", { forceRefresh: true });

  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);

  fake.sdk.clearToken();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(events.filter((type) => type === "read started").length).toBe(reads);
});

test("callbacks the application assigned keep being called as before, and dispose restores exactly them", async () => {
  const { fake, anchor } = create({ initialized: false });
  const heard: string[] = [];

  const onReady = (authenticated?: boolean) => {
    heard.push(`ready ${String(authenticated)}`);
  };

  const onAuthSuccess = () => {
    heard.push("success");
  };

  const onAuthRefreshSuccess = () => {
    heard.push("refreshed");
  };

  const onAuthLogout = () => {
    heard.push("logout");
  };

  Object.assign(fake.sdk, {
    onReady,
    onAuthSuccess,
    onAuthRefreshSuccess,
    onAuthLogout,
  });

  const started = anchor.start();

  fake.init("ada");
  await started;
  await getSignedInSession(anchor.session.get()).getToken("api", {
    forceRefresh: true,
  });
  fake.sdk.clearToken();

  expect(heard).toEqual(["success", "ready true", "refreshed", "logout"]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();

  expect(fake.sdk.onReady).toBe(onReady);
  expect(fake.sdk.onAuthSuccess).toBe(onAuthSuccess);
  expect(fake.sdk.onAuthRefreshSuccess).toBe(onAuthRefreshSuccess);
  expect(fake.sdk.onAuthLogout).toBe(onAuthLogout);
});

test("dispose leaves alone a callback the application assigned after the start, and restores the rest to nothing", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(fake.listeners()).toBe(4);

  const replaced = () => {};

  fake.sdk.onAuthLogout = replaced;
  anchor.dispose();

  expect(fake.sdk.onAuthLogout).toBe(replaced);
  expect(fake.listeners()).toBe(1);
});

test("a mapper receives the access token claims and its result is the session's user", async () => {
  const fake = createFakeKeycloak();

  const anchor = new Anchor({
    adapter: keycloak({
      sdk: fake.sdk,
      initialized: fake.initialized,
      user: (claims) => ({
        id: claims.sub,
        username: claims.preferred_username,
      }),
    }),
  });

  fake.login("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    username: "ada",
  });
});

test("a mapper that throws never fails keycloak-js's own login, and the session is read instead", async () => {
  const fake = createFakeKeycloak();

  const anchor = new Anchor({
    adapter: keycloak({
      sdk: fake.sdk,
      initialized: fake.initialized,
      user: (claims) => {
        if (claims.sub === "grace") {
          throw new Error("The mapper cannot map grace.");
        }

        return { id: claims.sub };
      },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  fake.login("ada");
  await anchor.start();

  expect(() => fake.login("grace")).not.toThrow();
  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).user).toEqual({ id: "ada" });
});

test("a profile mints the held access token, refreshing it when it expires within 30 seconds and whenever it is forced", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });

  fake.expire();

  await expect(session.getToken("api")).resolves.toMatchObject({
    value: "access.ada.2",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: "access.ada.3" });
  expect(fake.updates).toEqual([30, 30, -1]);
});

test("a token asked for a session keycloak-js no longer holds is refused before anything refreshes", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.updates).toEqual([]);
});

test("without a refresh token the held token is answered as it is, and a forced one is UNSUPPORTED", async () => {
  const { fake, anchor } = create();

  fake.login("ada", { refreshable: false });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toMatchObject({
    value: "access.ada.1",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "UNSUPPORTED" });
  expect(fake.updates).toEqual([]);
});

test("a refresh Keycloak refuses clears keycloak-js's tokens, so the session is signed out and its token rejects", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  fake.refuseRefresh();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("any other refresh failure is TOKEN_FAILED with keycloak-js's error as its cause, and the session stays", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const offline = new TypeError("fetch failed");

  fake.failures.update = offline;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: offline });
  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );
});

test("ending takes the GET logout page before it clears the tokens, and hands it back without calling logout()", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${LOGOUT_ENDPOINT}?client_id=anchor-client&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F&id_token_hint=id.ada.1`,
      },
    },
  );
  expect(fake.logoutUrls).toEqual([{ logoutMethod: "GET" }]);
  expect(fake.sdk.token).toBe(undefined);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a provider without an end-session endpoint still ends locally, with no page and an unknown remote session", async () => {
  const { fake, anchor } = create({ endSessionEndpoint: false });

  fake.login("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.sdk.token).toBe(undefined);
});

test("ending a session keycloak-js no longer holds clears nothing", async () => {
  const { fake, anchor } = create();

  fake.login("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.logoutUrls).toEqual([]);
  expect(fake.sdk.tokenParsed?.sub).toBe("grace");
});

test.each([
  ["an issuer", { sub: "ada" }],
  ["a subject", { iss: KEYCLOAK_ISSUER }],
])(
  "an access token without %s is outside the contract, so the first state is unavailable",
  async (_missing, tokenParsed) => {
    const fake = createFakeKeycloak();

    const anchor = new Anchor({
      adapter: keycloak({
        sdk: { ...fake.sdk, token: "access", tokenParsed },
        initialized: fake.initialized,
      }),
    });

    await anchor.start();

    expect(anchor.session.get()).toMatchObject({
      status: "unavailable",
      error: { code: "INVALID_ANSWER" },
    });
  },
);
