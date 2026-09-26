import { expect, test } from "vitest";

import { getAuth0SessionUser } from "src/utils/getAuth0SessionUser";

test("the default user is the profile fields under react-native-auth0's names, leaving out the organization and the actor", () => {
  expect(
    getAuth0SessionUser({
      sub: "auth0|ada",
      org_id: "org_acme",
      act: { sub: "auth0|support" },
      name: "Ada",
      nickname: "ada",
      picture: "https://cdn.example.com/ada.png",
      email: "ada@example.com",
      emailVerified: false,
    }),
  ).toEqual({
    sub: "auth0|ada",
    name: "Ada",
    nickname: "ada",
    picture: "https://cdn.example.com/ada.png",
    email: "ada@example.com",
    emailVerified: false,
  });
});

test("a field the ID token lacks is null in the default user", () => {
  expect(getAuth0SessionUser({ sub: "auth0|ada" })).toEqual({
    sub: "auth0|ada",
    name: null,
    nickname: null,
    picture: null,
    email: null,
    emailVerified: null,
  });
});
