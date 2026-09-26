import { expect, test } from "vitest";

import { getAuth0SessionUser } from "src/utils/getAuth0SessionUser";

test("the default user is the profile claims under Auth0's names, with null for a claim the token lacks", () => {
  expect(
    getAuth0SessionUser({
      iss: "https://example.us.auth0.com/",
      sub: "auth0|ada",
      sid: "sid_1",
      name: "Ada",
      email: "ada@example.com",
      email_verified: false,
    }),
  ).toEqual({
    sub: "auth0|ada",
    name: "Ada",
    nickname: null,
    picture: null,
    email: "ada@example.com",
    email_verified: false,
  });
});
