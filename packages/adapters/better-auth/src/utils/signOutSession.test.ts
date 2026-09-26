import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string, context: string) => ({
  session: {
    principal: { authority: "better-auth", subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

const ADA_CONTEXT = '[null,null,"session_1"]';

test("the session's own Better Auth session is signed out, on the server and here", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(1);
  expect(fake.current()).toBe(null);
});

test("another session, as the refreshed atom holds it, is never signed out", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  fake.signIn("user_ada");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(0);
});

test("a failed sign-out that left the session on the client is thrown as it is", async () => {
  const fake = createFakeBetterAuthClient();
  const failure = { status: 500, statusText: "Internal Server Error" };

  fake.signIn("user_ada");
  fake.failures.signOut = failure;

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).rejects.toBe(failure);
});

test("a failed sign-out after the Expo plugin cleared the session on the device ended it here, and the server's side is unknown", async () => {
  const fake = createFakeBetterAuthClient({ expo: true });

  fake.signIn("user_ada");
  fake.failures.signOutNetwork = new TypeError("Network request failed");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
});
