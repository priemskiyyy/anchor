import { afterEach, expect, test, vi } from "vitest";

import { createFakeNextAuthReact } from "src/fakeNextAuthReact.fixture";
import { signOutSession } from "src/utils/signOutSession";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = (subject: string) => ({
  session: {
    principal: { authority: "authjs", subject, tenant: null },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the session's own cookie is cleared by a sign-out that never redirects, and the server confirms it", async () => {
  const fake = createFakeNextAuthReact();

  fake.signIn("user_ada");

  await expect(
    signOutSession(fake.sdk, "/api/auth", request("user_ada")),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.session()).toBe(null);
  expect(fake.signOuts).toEqual([{ redirect: false }]);
  expect(fake.broadcasts).toEqual(["signout"]);
  expect(fake.endpointRequests).toEqual([
    "/api/auth/session",
    "/api/auth/session",
  ]);
  expect(fake.sessionRequests).toEqual([]);
});

test("another user's session is never signed out: the ending does not apply", async () => {
  const fake = createFakeNextAuthReact();

  fake.signIn("user_grace");

  await expect(
    signOutSession(fake.sdk, "/api/auth", request("user_ada")),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([]);
  expect(fake.session()?.user?.id).toBe("user_grace");
});

test("a sign-out the server refused with its CSRF check left the session in place, which is thrown, never answered as ended", async () => {
  const fake = createFakeNextAuthReact();

  fake.signIn("user_ada");
  fake.failures.csrf = true;

  await expect(
    signOutSession(fake.sdk, "/api/auth", request("user_ada")),
  ).rejects.toThrow(
    "Auth.js kept the session: the server refused to sign it out.",
  );
  expect(fake.session()?.user?.id).toBe("user_ada");
});

test("a sign-out request that fails is thrown as next-auth threw it", async () => {
  const fake = createFakeNextAuthReact();
  const failure = new TypeError("Failed to fetch");

  fake.signIn("user_ada");
  fake.failures.signOut = failure;

  await expect(
    signOutSession(fake.sdk, "/api/auth", request("user_ada")),
  ).rejects.toBe(failure);
});
