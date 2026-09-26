import { expect, test } from "vitest";

import { getOktaSessionUser } from "src/utils/getOktaSessionUser";

test("the default user is the profile claims under Okta's names, leaving out the protocol claims", () => {
  expect(
    getOktaSessionUser({
      iss: "https://anchor.okta.com/oauth2/default",
      sub: "00u_ada",
      sid: "idx_1",
      name: "Ada Lovelace",
      preferred_username: "ada@example.com",
      given_name: "Ada",
      family_name: "Lovelace",
      email: "ada@example.com",
      email_verified: false,
    }),
  ).toEqual({
    sub: "00u_ada",
    name: "Ada Lovelace",
    preferred_username: "ada@example.com",
    given_name: "Ada",
    family_name: "Lovelace",
    email: "ada@example.com",
    email_verified: false,
  });
});

test("a claim the ID token lacks is null in the default user", () => {
  expect(getOktaSessionUser({})).toEqual({
    sub: null,
    name: null,
    preferred_username: null,
    given_name: null,
    family_name: null,
    email: null,
    email_verified: null,
  });
});
