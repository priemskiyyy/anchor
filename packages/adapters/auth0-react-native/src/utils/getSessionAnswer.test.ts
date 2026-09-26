import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const AUTHORITY = "https://anchor-demo.us.auth0.com/";

test("no stored user is signed out", () => {
  expect(getSessionAnswer(null, AUTHORITY, (user) => user.sub)).toEqual({
    status: "signed-out",
  });
});

test("a stored user is signed in as the domain's issuer and the subject, with the organization as its context, impersonated when it names an actor", () => {
  expect(
    getSessionAnswer(
      {
        sub: "auth0|ada",
        org_id: "org_acme",
        act: { sub: "auth0|support" },
      },
      AUTHORITY,
      (user) => ({ id: user.sub }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: { authority: AUTHORITY, subject: "auth0|ada", tenant: null },
    user: { id: "auth0|ada" },
    context: "org_acme",
    guest: false,
    impersonated: true,
  });
  expect(
    getSessionAnswer({ sub: "auth0|ada" }, AUTHORITY, (user) => user.sub),
  ).toMatchObject({ context: null, impersonated: false });
});
