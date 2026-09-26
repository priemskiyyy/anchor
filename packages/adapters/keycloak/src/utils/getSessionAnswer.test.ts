import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no held token is signed out", () => {
  expect(getSessionAnswer(undefined, (claims) => claims.sub)).toEqual({
    status: "signed-out",
  });
});

test("a held token is signed in as its issuer and subject, with the organization and the Keycloak session as its context", () => {
  expect(
    getSessionAnswer(
      {
        iss: "https://sso.example.com/realms/anchor",
        sub: "ada",
        sid: "sid_1",
        organization: ["acme"],
      },
      (claims) => ({ id: claims.sub }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://sso.example.com/realms/anchor",
      subject: "ada",
      tenant: null,
    },
    user: { id: "ada" },
    context: '[["acme"],"sid_1"]',
    guest: false,
    impersonated: false,
  });
});
