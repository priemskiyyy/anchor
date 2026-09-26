import { expect, test } from "vitest";

import { isSessionAccount } from "src/utils/isSessionAccount";

const account = {
  homeAccountId: "oid-ada.tenant-contoso",
  environment: "login.windows.net",
  tenantId: "tenant-contoso",
  localAccountId: "oid-ada",
  username: "ada@contoso.example",
  idTokenClaims: { sid: "sid_1" },
};

const identity = ({
  authority = "login.windows.net",
  subject = "oid-ada.tenant-contoso",
  tenant = "tenant-contoso",
  context = "sid_1",
}: {
  authority?: string;
  subject?: string;
  tenant?: string | null;
  context?: string | null;
} = {}) => ({ principal: { authority, subject, tenant }, context });

test("the active account is the session's when its environment, home account id, tenant and sid all match", () => {
  expect(isSessionAccount(account, identity())).toBe(true);
  expect(
    isSessionAccount(
      account,
      identity({ authority: "login.microsoftonline.us" }),
    ),
  ).toBe(false);
  expect(
    isSessionAccount(
      account,
      identity({ subject: "oid-grace.tenant-contoso" }),
    ),
  ).toBe(false);
  expect(
    isSessionAccount(account, identity({ tenant: "tenant-fabrikam" })),
  ).toBe(false);
  expect(isSessionAccount(account, identity({ context: "sid_2" }))).toBe(false);
});

test("no active account is never the session's", () => {
  expect(isSessionAccount(null, identity())).toBe(false);
});
