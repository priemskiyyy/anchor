import { expect, test } from "vitest";

import { getSessionIdentity } from "src/utils/getSessionIdentity";

const account = {
  homeAccountId: "oid-ada.tenant-contoso",
  environment: "login.windows.net",
  tenantId: "tenant-contoso",
  localAccountId: "oid-ada",
  username: "ada@contoso.example",
};

test("the account's environment, home account id and tenant are the principal, and its ID token's sid is the context", () => {
  expect(
    getSessionIdentity({ ...account, idTokenClaims: { sid: "sid_1" } }),
  ).toEqual({
    principal: {
      authority: "login.windows.net",
      subject: "oid-ada.tenant-contoso",
      tenant: "tenant-contoso",
    },
    context: "sid_1",
  });
});

test("an account without ID token claims or a sid has no context", () => {
  expect(getSessionIdentity(account).context).toBe(null);
  expect(getSessionIdentity({ ...account, idTokenClaims: {} }).context).toBe(
    null,
  );
});

test("the empty tenant MSAL leaves outside Microsoft Entra ID is no tenant", () => {
  expect(getSessionIdentity({ ...account, tenantId: "" }).principal).toEqual({
    authority: "login.windows.net",
    subject: "oid-ada.tenant-contoso",
    tenant: null,
  });
});
