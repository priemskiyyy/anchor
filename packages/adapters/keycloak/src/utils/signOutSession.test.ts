import { expect, test } from "vitest";

import {
  KEYCLOAK_ISSUER,
  LOGOUT_ENDPOINT,
  createFakeKeycloak,
} from "src/fakeKeycloak.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: KEYCLOAK_ISSUER, subject, tenant: null },
    context: '[null,"sid_1"]',
  },
  signal: new AbortController().signal,
});

test("the session's own tokens are cleared and the logout page, built before they were, is handed back", () => {
  const fake = createFakeKeycloak();

  fake.login("ada");

  expect(signOutSession(fake.sdk, request("ada"))).toEqual({
    local: "completed",
    remote: "unknown",
    navigation: {
      url: `${LOGOUT_ENDPOINT}?client_id=anchor-client&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F&id_token_hint=id.ada.1`,
    },
  });
  expect(fake.logoutUrls).toEqual([{ logoutMethod: "GET" }]);
  expect(fake.sdk.token).toBe(undefined);
});

test("another session is never cleared: the ending does not apply", () => {
  const fake = createFakeKeycloak();

  fake.login("grace");

  expect(signOutSession(fake.sdk, request("ada"))).toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.sdk.token).toBe("access.grace.1");
});

test("a logout page keycloak-js cannot build leaves no page and an unknown remote session, and the tokens are still cleared", () => {
  const fake = createFakeKeycloak({ endSessionEndpoint: false });

  fake.login("ada");

  expect(signOutSession(fake.sdk, request("ada"))).toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.sdk.token).toBe(undefined);
});
