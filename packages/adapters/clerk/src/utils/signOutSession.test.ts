import { expect, test } from "vitest";

import { createFakeClerk } from "src/fakeClerk.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string, context: string) => ({
  session: {
    principal: {
      authority: "https://clerk.example.com",
      subject,
      tenant: null,
    },
    context,
  },
  signal: new AbortController().signal,
});

test("the session's own Clerk session is signed out by its id, never navigating, and removed on the client too", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");

  await expect(
    signOutSession(fake.sdk, request("user_ada", '[null,"sess_1",null]')),
  ).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([{ sessionId: "sess_1" }]);
  expect(fake.sdk.session).toBe(null);
  expect(fake.sdk.client?.signedInSessions).toEqual([]);
});

test("in a multi-session application only the active session is removed", async () => {
  const fake = createFakeClerk();
  const grace = fake.signIn("user_grace");

  fake.signIn("user_ada", { keepOthers: true });

  await expect(
    signOutSession(fake.sdk, request("user_ada", '[null,"sess_2",null]')),
  ).resolves.toMatchObject({ local: "completed", remote: "completed" });
  expect(fake.sdk.client?.signedInSessions).toEqual([grace]);
});

test("another session is never signed out, since with one signed in Clerk would remove it whatever id is named", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_grace");

  await expect(
    signOutSession(fake.sdk, request("user_ada", '[null,"sess_1",null]')),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([]);
  expect(fake.sdk.session?.user.id).toBe("user_grace");
});

test("a removal clerk-js could not send offline leaves the session on its client: ended here, unknown at Clerk", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");
  fake.failures.offline = true;

  await expect(
    signOutSession(fake.sdk, request("user_ada", '[null,"sess_1",null]')),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.sdk.session).toBe(null);
});

test("an ending asked for while Clerk switches back to the same session waits for it instead of ending nothing", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");
  fake.beginTransition();

  const ended = signOutSession(
    fake.sdk,
    request("user_ada", '[null,"sess_1",null]'),
  );

  await Promise.resolve();

  expect(fake.signOuts).toEqual([]);

  fake.endTransition();

  await expect(ended).resolves.toMatchObject({ local: "completed" });
  expect(fake.signOuts).toEqual([{ sessionId: "sess_1" }]);
});

test("a removal Clerk refuses is thrown as it is", async () => {
  const fake = createFakeClerk();
  const failure = new Error("Clerk: Network error.");

  fake.signIn("user_ada");
  fake.failures.removal = failure;

  await expect(
    signOutSession(fake.sdk, request("user_ada", '[null,"sess_1",null]')),
  ).rejects.toBe(failure);
});
