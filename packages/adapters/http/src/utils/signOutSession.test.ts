import { expect, test } from "vitest";

import { createFakeBackend } from "src/fakeBackend.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = {
  session: {
    principal: {
      authority: "https://api.example.com",
      subject: "user_ada",
      tenant: null,
    },
    context: '[null,"session_1"]',
  },
  signal: new AbortController().signal,
};

test("an end that resolves ended the session on the server and here", async () => {
  const backend = createFakeBackend();

  backend.signIn("user_ada");

  await expect(
    signOutSession(backend.client.endSession, request),
  ).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(backend.ends).toEqual([request]);
  expect(backend.current()).toBe(null);
});

test("an end that rejects is thrown as it is", async () => {
  const backend = createFakeBackend();
  const failure = new Error("The logout endpoint answered 503.");

  backend.failures.end = failure;

  await expect(signOutSession(backend.client.endSession, request)).rejects.toBe(
    failure,
  );
});
