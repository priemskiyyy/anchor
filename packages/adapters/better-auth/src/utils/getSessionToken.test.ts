import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { getSessionToken } from "src/utils/getSessionToken";

const request = (subject: string, context: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: "better-auth", subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

const ADA_CONTEXT = '[null,null,"session_1"]';

test("the token of the session the atom holds is answered as a bearer session token, without asking the server", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.holdFetches();

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    value: "token_1",
    kind: "session-token",
    scheme: "Bearer",
  });
});

test("a forced token refreshes the atom first, so a session the server ended is refused", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.endOnServer();

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT, true),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a forced token answers the token the refreshed atom holds", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.switchSilently("user_ada");

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", '[null,null,"session_2"]', true),
    ),
  ).resolves.toMatchObject({ value: "token_2" });
});

test("another user, or another Better Auth session of the same user, is refused with SESSION_CHANGED", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_grace");
  await fake.refetch();

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_grace", '[null,null,"session_9"]'),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("no session in the atom is refused with SESSION_CHANGED", async () => {
  const fake = createFakeBetterAuthClient();

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a server that sends the client no session token is UNSUPPORTED", async () => {
  const fake = createFakeBetterAuthClient({ omitToken: true });

  fake.signIn("user_ada");
  await fake.refetch();

  await expect(
    getSessionToken(
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).rejects.toMatchObject({ code: "UNSUPPORTED" });
});
