import { expect, test } from "vitest";

import { getOidcSessionUser } from "src/utils/getOidcSessionUser";

test("the default user is the profile claims under their OpenID Connect names, leaving out the protocol claims", () => {
  expect(
    getOidcSessionUser({
      iss: "https://id.example.com",
      sub: "ada",
      sid: "sid_1",
      org_id: "org_acme",
      name: "Ada Lovelace",
      given_name: "Ada",
      family_name: "Lovelace",
      preferred_username: "ada.lovelace",
      email: "ada@example.com",
      email_verified: false,
      picture: "https://cdn.example.com/ada.png",
    }),
  ).toEqual({
    sub: "ada",
    name: "Ada Lovelace",
    given_name: "Ada",
    family_name: "Lovelace",
    preferred_username: "ada.lovelace",
    email: "ada@example.com",
    email_verified: false,
    picture: "https://cdn.example.com/ada.png",
  });
});

test("a claim the ID token lacks is null in the default user", () => {
  expect(getOidcSessionUser({})).toEqual({
    sub: null,
    name: null,
    given_name: null,
    family_name: null,
    preferred_username: null,
    email: null,
    email_verified: null,
    picture: null,
  });
});
