import { expect, test } from "vitest";

import { getKeycloakSessionUser } from "src/utils/getKeycloakSessionUser";

test("the default user is the profile claims under Keycloak's names, leaving out roles and protocol claims", () => {
  expect(
    getKeycloakSessionUser({
      iss: "https://sso.example.com/realms/anchor",
      sub: "ada",
      sid: "sid_1",
      organization: ["acme"],
      name: "Ada Lovelace",
      preferred_username: "ada",
      given_name: "Ada",
      family_name: "Lovelace",
      email: "ada@example.com",
      email_verified: false,
    }),
  ).toEqual({
    sub: "ada",
    name: "Ada Lovelace",
    preferred_username: "ada",
    given_name: "Ada",
    family_name: "Lovelace",
    email: "ada@example.com",
    email_verified: false,
  });
});

test("a claim the access token lacks is null in the default user", () => {
  expect(getKeycloakSessionUser({})).toEqual({
    sub: null,
    name: null,
    preferred_username: null,
    given_name: null,
    family_name: null,
    email: null,
    email_verified: null,
  });
});
