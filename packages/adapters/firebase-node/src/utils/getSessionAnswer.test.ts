import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no verified credential is signed out", () => {
  expect(getSessionAnswer(null, ({ uid }) => uid)).toEqual({
    status: "signed-out",
  });
});

test("verified claims are signed in as their uid, under the issuer of the project's ID tokens, with their tenant, a guest when anonymous", () => {
  expect(
    getSessionAnswer(
      {
        aud: "anchor-project",
        uid: "ada",
        firebase: { sign_in_provider: "anonymous", tenant: "tenant-acme" },
      },
      ({ uid }) => ({ uid }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://securetoken.google.com/anchor-project",
      subject: "ada",
      tenant: "tenant-acme",
    },
    user: { uid: "ada" },
    context: null,
    guest: true,
    impersonated: false,
  });
  expect(
    getSessionAnswer(
      {
        aud: "anchor-project",
        uid: "ada",
        firebase: { sign_in_provider: "google.com" },
      },
      ({ uid }) => uid,
    ),
  ).toMatchObject({ principal: { tenant: null }, guest: false });
});
