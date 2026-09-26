import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const ISSUER = "https://sso.example.com/realms/anchor";

const identity = (authority: string, subject: string, context: string) => ({
  principal: { authority, subject, tenant: null },
  context,
});

test("the held access token is the session's when its issuer, subject and context all match", () => {
  const claims = { iss: ISSUER, sub: "ada", sid: "sid_1" };

  expect(isSessionUser(claims, identity(ISSUER, "ada", '[null,"sid_1"]'))).toBe(
    true,
  );
  expect(
    isSessionUser(
      claims,
      identity("https://sso.example.com/realms/other", "ada", '[null,"sid_1"]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(claims, identity(ISSUER, "grace", '[null,"sid_1"]')),
  ).toBe(false);
  expect(isSessionUser(claims, identity(ISSUER, "ada", '[null,"sid_2"]'))).toBe(
    false,
  );
  expect(
    isSessionUser(undefined, identity(ISSUER, "ada", '[null,"sid_1"]')),
  ).toBe(false);
});
