import { expect, test } from "vitest";

import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const request = (subject: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: "supabase", subject, tenant: null },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the session's access token is answered with its token type as the scheme", async () => {
  const fake = createFakeSupabase();

  fake.signIn("ada");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "bearer",
  });
  expect(fake.refreshes).toEqual([]);
});

test("a forced token refreshes the session first and answers the new access token", async () => {
  const fake = createFakeSupabase();

  fake.signIn("ada");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).resolves.toMatchObject({
    value: "access.ada.2",
  });
  expect(fake.refreshes).toEqual(["ada"]);
});

test("another session is refused with SESSION_CHANGED before any refresh", async () => {
  const fake = createFakeSupabase();

  fake.signIn("grace");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.refreshes).toEqual([]);
});

test("a refresh supabase-js answers with an error is thrown as it is", async () => {
  const fake = createFakeSupabase();
  const failure = { name: "AuthApiError", message: "Invalid Refresh Token" };

  fake.signIn("ada");
  fake.failures.refresh = failure;

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toBe(failure);
});
