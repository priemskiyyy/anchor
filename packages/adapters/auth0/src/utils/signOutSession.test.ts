import { expect, test } from "vitest";

import {
  AUTH0_ISSUER,
  createFakeAuth0Client,
} from "src/fakeAuth0Client.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: AUTH0_ISSUER, subject, tenant: null },
    context: '[null,"sid_1"]',
  },
  signal: new AbortController().signal,
});

test("the session's own login is cleared locally and Auth0's logout page is handed over", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");

  await expect(
    signOutSession(fake.sdk, undefined, request("auth0|ada")),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: { url: `${AUTH0_ISSUER}v2/logout?client_id=anchor-client` },
  });
  expect(fake.logouts).toEqual([{ openUrl: expect.any(Function) }]);
  expect(fake.claims()).toBe(undefined);
});

test("another login is never logged out: the ending does not apply", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|grace");

  await expect(
    signOutSession(fake.sdk, undefined, request("auth0|ada")),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.logouts).toEqual([]);
});

test("a client that navigates by itself hands over no page", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");

  const sdk = { ...fake.sdk, logout: async () => {} };

  await expect(
    signOutSession(sdk, undefined, request("auth0|ada")),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
});
