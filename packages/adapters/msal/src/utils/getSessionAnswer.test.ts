import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no active account is signed out", () => {
  expect(getSessionAnswer(null, (account) => account.homeAccountId)).toEqual({
    status: "signed-out",
  });
});

test("an active account is signed in as its identity, with the mapper's user, and is never a guest or impersonated", () => {
  expect(
    getSessionAnswer(
      {
        homeAccountId: "oid-ada.tenant-contoso",
        environment: "login.windows.net",
        tenantId: "tenant-contoso",
        localAccountId: "oid-ada",
        username: "ada@contoso.example",
        idTokenClaims: { sid: "sid_1" },
      },
      (account) => ({ id: account.homeAccountId }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "login.windows.net",
      subject: "oid-ada.tenant-contoso",
      tenant: "tenant-contoso",
    },
    user: { id: "oid-ada.tenant-contoso" },
    context: "sid_1",
    guest: false,
    impersonated: false,
  });
});
