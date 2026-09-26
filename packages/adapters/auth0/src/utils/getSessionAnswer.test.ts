import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no ID token is signed out", () => {
  expect(getSessionAnswer(undefined, (claims) => claims.sub)).toEqual({
    status: "signed-out",
  });
});

test("an ID token is signed in as its issuer and subject, impersonated when it names an actor", () => {
  expect(
    getSessionAnswer(
      {
        iss: "https://example.us.auth0.com/",
        sub: "auth0|ada",
        sid: "sid_1",
        act: { sub: "auth0|support" },
      },
      (claims) => ({ id: claims.sub }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://example.us.auth0.com/",
      subject: "auth0|ada",
      tenant: null,
    },
    user: { id: "auth0|ada" },
    context: '[null,"sid_1"]',
    guest: false,
    impersonated: true,
  });
});
