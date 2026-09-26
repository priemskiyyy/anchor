import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const ISSUER = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Pool";

test("no signed-in user is signed out", () => {
  expect(getSessionAnswer(null, (user) => user.userId)).toEqual({
    status: "signed-out",
  });
});

test("a signed-in user is a session of the ID token's issuer and subject, with its origin_jti as the context and the mapper's user", () => {
  expect(
    getSessionAnswer(
      {
        user: { username: "ada", userId: "7c1f-ada" },
        idToken: {
          payload: { iss: ISSUER, sub: "7c1f-ada", origin_jti: "origin_1" },
          toString: () => "id-token",
        },
      },
      (user) => ({ id: user.userId }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: { authority: ISSUER, subject: "7c1f-ada", tenant: null },
    user: { id: "7c1f-ada" },
    context: "origin_1",
    guest: false,
    impersonated: false,
  });
});
