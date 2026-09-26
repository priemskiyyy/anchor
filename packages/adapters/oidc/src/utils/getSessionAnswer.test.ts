import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no stored user is signed out", () => {
  expect(getSessionAnswer(null, (profile) => profile.sub)).toEqual({
    status: "signed-out",
  });
});

test("a stored user is signed in as its issuer and subject, impersonated when the ID token names an actor", () => {
  expect(
    getSessionAnswer(
      {
        access_token: "access",
        token_type: "Bearer",
        profile: {
          iss: "https://id.example.com",
          sub: "ada",
          sid: "sid_1",
          act: { sub: "support" },
        },
      },
      (profile) => ({ id: profile.sub }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://id.example.com",
      subject: "ada",
      tenant: null,
    },
    user: { id: "ada" },
    context: '[null,null,"sid_1",{"sub":"support"}]',
    guest: false,
    impersonated: true,
  });
});
