import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  END_SESSION_ENDPOINT,
  OIDC_ISSUER,
  createFakeUserManager,
} from "src/fakeUserManager.fixture";
import { oidc } from "src/oidc";

const create = (options: Parameters<typeof createFakeUserManager>[0] = {}) => {
  const fake = createFakeUserManager(options);

  const anchor = new Anchor({
    adapter: oidc({ sdk: fake.sdk, tokens: { api: accessToken() } }),
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

test("creating the adapter reads, subscribes to and calls nothing on the UserManager", () => {
  const fake = createFakeUserManager();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = oidc({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("oidc");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("a stored user is a session of its ID token's issuer and subject, whose user is a snapshot of the profile claims", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: OIDC_ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "ada",
    name: "ADA",
    given_name: null,
    family_name: null,
    preferred_username: "ada",
    email: "ada@example.com",
    email_verified: true,
    picture: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("an act claim is an impersonated session", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada", { impersonatedBy: "support" });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).impersonated).toBe(true);
});

test("the same subject in another organization, impersonation or provider session is a new session, and the same claims keep the key", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada", { sid: "sid_a" });
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  await fake.signIn("ada", { sid: "sid_a", org: "acme" });

  const acme = getSignedInSession(anchor.session.get());

  await fake.signIn("ada", {
    sid: "sid_a",
    org: "acme",
    impersonatedBy: "support",
  });

  const impersonated = getSignedInSession(anchor.session.get());

  await fake.signIn("ada", { sid: "sid_b", org: "acme" });

  const relogged = getSignedInSession(anchor.session.get());

  await fake.signIn("ada", { sid: "sid_b", org: "acme" });

  expect(
    new Set([first.key, acme.key, impersonated.key, relogged.key]).size,
  ).toBe(4);
  expect(getSignedInSession(anchor.session.get()).key).toBe(relogged.key);
});

test("a user the UserManager loads after the start is pushed, and removing it pushes signed-out, without a read", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const reads = events.filter((type) => type === "read started").length;

  await fake.signIn("ada");

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );

  await fake.sdk.removeUser();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(events.filter((type) => type === "read started").length).toBe(reads);
});

test("the provider's sign-out notice asks for a read, so the session stays until the UserManager removes the user", async () => {
  const { fake, anchor, events } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());
  const reads = events.filter((type) => type === "read completed").length;

  await fake.signOutAtProvider();
  await expect
    .poll(() => events.filter((type) => type === "read completed").length)
    .toBe(reads + 1);

  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);

  await fake.sdk.removeUser();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a mapper receives the profile claims and its result is the session's user", async () => {
  const fake = createFakeUserManager();

  const anchor = new Anchor({
    adapter: oidc({
      sdk: fake.sdk,
      user: (profile) => ({ id: profile.sub, email: profile.email }),
    }),
  });

  await fake.signIn("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    email: "ada@example.com",
  });
});

test("a mapper that throws never fails the UserManager's own sign-in, and the session is read instead", async () => {
  const fake = createFakeUserManager();

  const anchor = new Anchor({
    adapter: oidc({
      sdk: fake.sdk,
      user: (profile) => {
        if (profile.sub === "grace") {
          throw new Error("The mapper cannot map grace.");
        }

        return { id: profile.sub };
      },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  await fake.signIn("ada");
  await anchor.start();

  await expect(fake.signIn("grace")).resolves.toBe(undefined);
  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).user).toEqual({ id: "ada" });
});

test("a profile answers the stored access token with its token type as the scheme, and renews only when it has expired or is forced", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.renewals).toEqual([]);

  fake.expire();

  await expect(session.getToken("api")).resolves.toMatchObject({
    value: "access.ada.2",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: "access.ada.3" });
  expect(fake.renewals).toEqual(["ada", "ada"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a renewal that brings back another subject is SESSION_CHANGED, and that subject replaces the session", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.renewing.subject = "grace";

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "grace",
  );
});

test("a token asked for a user the UserManager no longer holds is refused before anything renews", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.renewals).toEqual([]);
});

test("login_required and its kind ask for the user with INTERACTION_REQUIRED, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const consent = Object.assign(new Error("consent_required"), {
    error: "consent_required",
  });

  fake.failures.renew = consent;

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: consent });

  const timeout = Object.assign(
    new Error("IFrame timed out without a response"),
    {
      name: "ErrorTimeout",
    },
  );

  fake.failures.renew = timeout;

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: timeout });
});

test("ending removes the user and hands back the provider's end-session page with the ID token as its hint", async () => {
  const { fake, anchor } = create({
    postLogoutRedirectUri: "https://app.example.com/goodbye",
  });

  await fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${END_SESSION_ENDPOINT}?id_token_hint=id.ada.1&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
      },
    },
  );
  expect(fake.stored()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a provider without an end-session endpoint ends locally and says there is no remote step", async () => {
  const { fake, anchor } = create({ endSessionEndpoint: null });

  await fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "not-applicable", navigation: null },
  );
  expect(fake.stored()).toBe(null);
});

test("metadata that cannot be read still ends the session locally, and leaves the provider's session unknown", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  fake.failures.metadata = new TypeError("fetch failed");

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.stored()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session the UserManager no longer holds removes nobody", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.stored()?.profile.sub).toBe("grace");
});

test.each([
  ["an issuer", { sub: "ada" }],
  ["a subject", { iss: OIDC_ISSUER }],
])(
  "a profile without %s is outside the contract, so the first state is unavailable",
  async (_missing, profile) => {
    const fake = createFakeUserManager();

    const anchor = new Anchor({
      adapter: oidc({
        sdk: {
          ...fake.sdk,
          getUser: async () => ({
            access_token: "access",
            token_type: "Bearer",
            profile,
          }),
        },
      }),
    });

    await anchor.start();

    expect(anchor.session.get()).toMatchObject({
      status: "unavailable",
      error: { code: "INVALID_ANSWER" },
    });
  },
);

test("dispose removes exactly the callbacks the adapter added, and the application's own keep being called", async () => {
  const { fake, anchor } = create();
  const heard: string[] = [];

  fake.sdk.events.addUserLoaded((user) => {
    heard.push(`loaded ${user.profile.sub}`);
  });
  fake.sdk.events.addUserUnloaded(() => {
    heard.push("unloaded");
  });
  fake.sdk.events.addUserSignedOut(() => {
    heard.push("signed out");
  });

  await anchor.start();

  expect(fake.listeners()).toBe(6);

  anchor.dispose();

  expect(fake.listeners()).toBe(3);

  await fake.signIn("ada");
  await fake.signOutAtProvider();
  await fake.sdk.removeUser();

  expect(heard).toEqual(["loaded ada", "signed out", "unloaded"]);
});
