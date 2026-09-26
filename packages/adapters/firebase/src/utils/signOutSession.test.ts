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

test("the session's own user is signed out locally, with no remote step", async () => {
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
