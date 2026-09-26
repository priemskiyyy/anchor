import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const ISSUER = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Pool";

const identity = (
  authority: string,
  subject: string,
  context: string | null,
) => ({ principal: { authority, subject, tenant: null }, context });

test("the ID token is the session's when its issuer, subject and origin_jti all match", () => {
  const payload = { iss: ISSUER, sub: "ada", origin_jti: "origin_1" };

  expect(isSessionUser(payload, identity(ISSUER, "ada", "origin_1"))).toBe(
    true,
  );
  expect(
    isSessionUser(
      payload,
      identity(
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Pool",
        "ada",
        "origin_1",
      ),
    ),
  ).toBe(false);
  expect(isSessionUser(payload, identity(ISSUER, "grace", "origin_1"))).toBe(
    false,
  );
  expect(isSessionUser(payload, identity(ISSUER, "ada", "origin_2"))).toBe(
    false,
  );
});

test("an ID token without origin_jti matches a session without a context", () => {
  const payload = { iss: ISSUER, sub: "ada" };

  expect(isSessionUser(payload, identity(ISSUER, "ada", null))).toBe(true);
  expect(isSessionUser(payload, identity(ISSUER, "ada", "origin_1"))).toBe(
    false,
  );
});
