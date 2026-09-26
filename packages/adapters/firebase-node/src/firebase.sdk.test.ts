import { Agent } from "node:https";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { expect, test } from "vitest";

import {
  PROJECT_ID,
  createAuth,
  createEmulatorAuth,
  mintCredential,
} from "src/fakeAuthEmulator.fixture";
import { firebase } from "src/firebase";

const withSessionCookie = (sessionCookie: string) =>
  new Request("https://app.example.com/", {
    headers: { cookie: `__session=${sessionCookie}` },
  });

const withIdToken = (idToken: string) =>
  new Request("https://app.example.com/", {
    headers: { authorization: `Bearer ${idToken}` },
  });

test("the real firebase-admin Auth in emulator mode: each request reads as the user its session cookie or bearer ID token carries, concurrently", async () => {
  const { auth, emulator } = await createEmulatorAuth();
  const adapter = firebase({ sdk: auth });
  const ada = emulator.signUp("ada");
  const grace = emulator.signUp("grace");
  const guest = emulator.signUp("guest", { anonymous: true });

  const [adaRequest, graceRequest, guestRequest, anonymousRequest] =
    await Promise.all([
      getRequestSession(withSessionCookie(ada.sessionCookie), { adapter }),
      getRequestSession(withIdToken(grace.idToken), { adapter }),
      getRequestSession(withSessionCookie(guest.sessionCookie), { adapter }),
      getRequestSession(new Request("https://app.example.com/"), { adapter }),
    ]);

  expect(adaRequest.state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: `https://securetoken.google.com/${PROJECT_ID}`,
        subject: ada.uid,
        tenant: null,
      },
      user: {
        uid: ada.uid,
        email: "ada@example.com",
        emailVerified: false,
        displayName: "ADA",
        photoURL: null,
        phoneNumber: null,
      },
      guest: false,
      impersonated: false,
    },
  });
  expect(graceRequest.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: grace.uid }, guest: false },
  });
  expect(guestRequest.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: guest.uid }, guest: true },
  });
  expect(anonymousRequest.state).toEqual({ status: "signed-out" });
  expect([...emulator.lookups].sort()).toEqual(
    [ada.uid, grace.uid, guest.uid].sort(),
  );
});

test("the real Auth refuses an expired session cookie, a revoked session, a disabled user and a deleted one, each signed out", async () => {
  const { auth, emulator } = await createEmulatorAuth();
  const adapter = firebase({ sdk: auth, checkRevoked: true });
  const expired = emulator.signUp("expired");
  const revoked = emulator.signUp("revoked");
  const disabled = emulator.signUp("disabled");
  const deleted = emulator.signUp("deleted");

  emulator.revoke(revoked.uid);
  emulator.disable(disabled.uid);
  emulator.remove(deleted.uid);

  const states = await Promise.all(
    [
      withSessionCookie(expired.mint("session-cookie", { lifetime: -60 })),
      withSessionCookie(revoked.sessionCookie),
      withIdToken(disabled.idToken),
      withSessionCookie(deleted.sessionCookie),
    ].map(
      async (request) => (await getRequestSession(request, { adapter })).state,
    ),
  );

  expect(states).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
});

test("the real Auth refuses a session cookie of another project, an ID token sent as a session cookie and a value that is no JWT, each signed out", async () => {
  const { auth, emulator } = await createEmulatorAuth();
  const adapter = firebase({ sdk: auth });
  const ada = emulator.signUp("ada");

  const states = await Promise.all(
    [
      withSessionCookie(
        ada.mint("session-cookie", { projectId: "another-project" }),
      ),
      withSessionCookie(ada.idToken),
      withSessionCookie("not-a-jwt"),
      withIdToken(ada.sessionCookie),
    ].map(
      async (request) => (await getRequestSession(request, { adapter })).state,
    ),
  );

  expect(states).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
});

test("the real Auth makes a read whose user lookup failed unavailable, never signed out", async () => {
  const { auth, emulator } = await createEmulatorAuth();
  const ada = emulator.signUp("ada");

  emulator.failures.lookup = true;

  const { state } = await getRequestSession(
    withSessionCookie(ada.sessionCookie),
    { adapter: firebase({ sdk: auth }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: { code: "auth/internal-error" } },
  });
});

test("the real Auth outside emulator mode makes a failure to fetch Google's public keys unavailable, never signed out, and refuses a value that is no JWT as signed out", async () => {
  const offline = new Agent({
    lookup: (hostname, _options, callback) =>
      callback(
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), {
          code: "ENOTFOUND",
        }),
        "",
        4,
      ),
  });

  const adapter = firebase({ sdk: createAuth(offline) });

  const signed = mintCredential(
    "https://session.firebase.google.com/",
    { localId: "uid-ada", email: "ada@example.com", disabled: false },
    { header: { alg: "RS256", kid: "anchor-key", typ: "JWT" } },
  );

  const [unfetched, undecodable] = await Promise.all([
    getRequestSession(withSessionCookie(`${signed}c2lnbmF0dXJl`), { adapter }),
    getRequestSession(withSessionCookie("not-a-jwt"), { adapter }),
  ]);

  expect(unfetched.state).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: {
        code: "auth/argument-error",
        message: expect.stringContaining("ENOTFOUND www.googleapis.com"),
      },
    },
  });
  expect(undecodable.state).toEqual({ status: "signed-out" });
});
