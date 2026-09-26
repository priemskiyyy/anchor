import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: {
      authority: "https://securetoken.google.com/demo",
      subject,
      tenant: null,
    },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the session's own user is signed out of this app, with no remote step", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.current()).toBe(null);
});

test("another user is never signed out: the ending does not apply", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.current()?.uid).toBe("grace");
});

test("a user the native SDK switched to before JavaScript heard of it is never signed out: the ending does not apply", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");
  fake.switchNatively("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.nativeUser()).toBe("grace");
});

test("a native SDK that already holds no user does not apply, and any other refusal is thrown as it came", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");
  fake.signOutNatively();

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });

  const failure = { code: "auth/internal-error" };

  fake.signIn("ada");
  fake.failures.signOut = failure;

  await expect(signOutSession(fake.sdk, request("ada"))).rejects.toBe(failure);
  expect(fake.current()?.uid).toBe("ada");
});
