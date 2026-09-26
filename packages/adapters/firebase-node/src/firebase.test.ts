import { getRequestSession } from "@priemskiyyy/anchor-server";
import { FirebaseAuthError } from "firebase-admin/auth";
import { expect, test } from "vitest";

import {
  createFakeFirebaseAuth,
  requestWith,
} from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";

test("creating the adapter reads and calls nothing on the Auth instance", () => {
  const fake = createFakeFirebaseAuth();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = firebase({ sdk, cookie: "session", checkRevoked: true });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("firebase-node");
});

test("a request's session cookie reads as its Firebase user, mapped as the client adapter maps it", async () => {
  const fake = createFakeFirebaseAuth();
  const { sessionCookie } = fake.signIn("ada");

  const { state, headers } = await getRequestSession(
    requestWith({ cookie: `theme=dark; __session=${sessionCookie}` }),
    { adapter: firebase({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: "https://securetoken.google.com/anchor-project",
        subject: "ada",
        tenant: null,
      },
      user: {
        uid: "ada",
        email: "ada@example.com",
        emailVerified: true,
        displayName: "ADA",
        photoURL: "https://example.com/ada.png",
        phoneNumber: null,
      },
      guest: false,
      impersonated: false,
    },
  });
  expect([...headers]).toEqual([]);
  expect(fake.calls).toEqual([["verifySessionCookie", sessionCookie, false]]);
});

test("a bearer ID token reads as its user, ahead of a session cookie on the same request", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");
  const grace = fake.signIn("grace");

  const { state } = await getRequestSession(
    requestWith({
      authorization: `Bearer ${ada.idToken}`,
      cookie: `__session=${grace.sessionCookie}`,
    }),
    { adapter: firebase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "ada" }, user: { uid: "ada" } },
  });
  expect(fake.calls).toEqual([["verifyIdToken", ada.idToken, false]]);
});

test("the session cookie is read from the cookie the options name", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");
  const grace = fake.signIn("grace");

  const { state } = await getRequestSession(
    requestWith({
      cookie: `__session=${grace.sessionCookie}; session=${ada.sessionCookie}`,
    }),
    { adapter: firebase({ sdk: fake.sdk, cookie: "session" }) },
  );

  expect(state).toMatchObject({ session: { principal: { subject: "ada" } } });
});

test("an anonymous Firebase user is a guest, and an Identity Platform user carries its tenant", async () => {
  const fake = createFakeFirebaseAuth();
  const guest = fake.signIn("guest", { provider: "anonymous" });
  const member = fake.signIn("member", { tenant: "tenant-acme" });
  const adapter = firebase({ sdk: fake.sdk });

  const [guestRequest, memberRequest] = await Promise.all([
    getRequestSession(
      requestWith({ cookie: `__session=${guest.sessionCookie}` }),
      { adapter },
    ),
    getRequestSession(
      requestWith({ cookie: `__session=${member.sessionCookie}` }),
      { adapter },
    ),
  ]);

  expect(guestRequest.state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: "https://securetoken.google.com/anchor-project",
        subject: "guest",
        tenant: null,
      },
      user: {
        uid: "guest",
        email: null,
        emailVerified: false,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
      },
      guest: true,
      impersonated: false,
    },
  });
  expect(memberRequest.state).toMatchObject({
    session: {
      principal: { subject: "member", tenant: "tenant-acme" },
      guest: false,
    },
  });
});

test("a request without a session cookie or a bearer ID token is signed out without asking Firebase", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  const { state } = await getRequestSession(
    requestWith({
      cookie: "theme=dark",
      authorization: "Basic YWRhOnNlY3JldA==",
    }),
    { adapter: firebase({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(fake.calls).toEqual([]);
});

test("a credential firebase-admin cannot decode, and one that expired, are signed out", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");
  const adapter = firebase({ sdk: fake.sdk });

  fake.expire(ada.idToken);

  const [forged, expired] = await Promise.all([
    getRequestSession(requestWith({ cookie: "__session=forged" }), { adapter }),
    getRequestSession(requestWith({ authorization: `Bearer ${ada.idToken}` }), {
      adapter,
    }),
  ]);

  expect(forged.state).toEqual({ status: "signed-out" });
  expect(expired.state).toEqual({ status: "signed-out" });
});

test("checkRevoked reaches firebase-admin, which refuses a revoked session, a disabled user and a deleted one, each signed out", async () => {
  const fake = createFakeFirebaseAuth();
  const revoked = fake.signIn("revoked");
  const disabled = fake.signIn("disabled");
  const deleted = fake.signIn("deleted");
  const adapter = firebase({ sdk: fake.sdk, checkRevoked: true });

  fake.revoke("revoked");
  fake.disable("disabled");
  fake.remove("deleted");

  const states = await Promise.all(
    [revoked.sessionCookie, disabled.sessionCookie, deleted.idToken].map(
      async (credential) => {
        const request = credential.startsWith("token_")
          ? requestWith({ authorization: `Bearer ${credential}` })
          : requestWith({ cookie: `__session=${credential}` });

        return (await getRequestSession(request, { adapter })).state;
      },
    ),
  );

  expect(states).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
  expect(fake.calls).toEqual([
    ["verifySessionCookie", revoked.sessionCookie, true],
    ["verifySessionCookie", disabled.sessionCookie, true],
    ["verifyIdToken", deleted.idToken, true],
  ]);
});

test("without checkRevoked a revoked session still reads as signed in, as firebase-admin verifies it", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");

  fake.revoke("ada");

  const { state } = await getRequestSession(
    requestWith({ cookie: `__session=${ada.sessionCookie}` }),
    { adapter: firebase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "ada" } },
  });
});

test("a failure to fetch Google's public keys, which firebase-admin also answers auth/argument-error, is unavailable, never signed out", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");

  const failure = new FirebaseAuthError({
    code: "argument-error",
    message:
      "Error while making request: getaddrinfo ENOTFOUND www.googleapis.com. Error code: ENOTFOUND",
  });

  fake.failures.verify = failure;

  const { state } = await getRequestSession(
    requestWith({ cookie: `__session=${ada.sessionCookie}` }),
    { adapter: firebase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("any other failure to verify is unavailable with the error as its cause", async () => {
  const failures = [
    new FirebaseAuthError({
      code: "internal-error",
      message: "An internal error has occurred.",
    }),
    new FirebaseAuthError({
      code: "invalid-credential",
      message:
        "Must initialize app with a cert credential or set your Firebase project ID.",
    }),
    new TypeError("fetch failed"),
  ];

  const states = await Promise.all(
    failures.map(async (failure) => {
      const fake = createFakeFirebaseAuth();
      const ada = fake.signIn("ada");

      fake.failures.verify = failure;

      const { state } = await getRequestSession(
        requestWith({ cookie: `__session=${ada.sessionCookie}` }),
        { adapter: firebase({ sdk: fake.sdk }) },
      );

      return state;
    }),
  );

  expect(states).toMatchObject(
    failures.map((failure) => ({
      status: "unavailable",
      error: { code: "READ_FAILED", cause: failure },
    })),
  );
});

test("a mapper receives the verified claims, and its result is the session's user", async () => {
  const fake = createFakeFirebaseAuth();
  const ada = fake.signIn("ada");

  const { state } = await getRequestSession(
    requestWith({ cookie: `__session=${ada.sessionCookie}` }),
    {
      adapter: firebase({
        sdk: fake.sdk,
        user: (token) => ({
          id: token.uid,
          provider: token.firebase.sign_in_provider,
        }),
      }),
    },
  );

  expect(state).toMatchObject({
    session: { user: { id: "ada", provider: "password" } },
  });
});
