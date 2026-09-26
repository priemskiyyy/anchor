import { expect, test } from "vitest";

import { getMsalSessionUser } from "src/utils/getMsalSessionUser";

const account = {
  homeAccountId: "oid-ada.tenant-contoso",
  environment: "login.windows.net",
  tenantId: "tenant-contoso",
  localAccountId: "oid-ada",
  username: "ada@contoso.example",
};

test("the default user is the account's fields under MSAL's names, leaving out its ID token claims", () => {
  expect(
    getMsalSessionUser({
      ...account,
      name: "Ada Lovelace",
      idTokenClaims: { sid: "sid_1" },
    }),
  ).toEqual({
    homeAccountId: "oid-ada.tenant-contoso",
    environment: "login.windows.net",
    tenantId: "tenant-contoso",
    username: "ada@contoso.example",
    localAccountId: "oid-ada",
    name: "Ada Lovelace",
  });
});

test("a name the account lacks is null in the default user", () => {
  expect(getMsalSessionUser(account).name).toBe(null);
});
