import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { AUTH0_ISSUER, createFakeAuth0 } from "src/fakeAuth0.fixture";
import { signOutSession } from "src/utils/signOutSession";

const tokens = {
  api: accessToken({ audience: "https://api.example.com", scope: "read" }),
  reports: accessToken({ audience: "https://reports.example.com" }),
  login: accessToken(),
};

const request = (subject: string) => ({
  session: {
    principal: { authority: AUTH0_ISSUER, subject, tenant: null },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the session's own login is cleared with every declared audience's API credentials, and Auth0's own session is left unknown", async () => {
  const fake = createFakeAuth0();

  fake.login("auth0|ada");
  fake.calls.length = 0;

  await expect(
    signOutSession(fake.sdk, fake.parseIdToken, tokens, request("auth0|ada")),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
    ["clearApiCredentials", "https://api.example.com", "read"],
    ["clearApiCredentials", "https://reports.example.com", undefined],
    ["clearCredentials"],
  ]);
  expect(fake.stored()).toBe(null);
});

test("another login, or none, is never cleared: the ending does not apply", async () => {
  const fake = createFakeAuth0();

  await expect(
    signOutSession(fake.sdk, fake.parseIdToken, tokens, request("auth0|ada")),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });

  fake.login("auth0|grace");

  await expect(
    signOutSession(fake.sdk, fake.parseIdToken, tokens, request("auth0|ada")),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(
    fake.calls.flatMap(([method]) =>
      method === "clearCredentials" || method === "clearApiCredentials"
        ? [method]
        : [],
    ),
  ).toEqual([]);
  expect(fake.stored()).not.toBe(null);
});
