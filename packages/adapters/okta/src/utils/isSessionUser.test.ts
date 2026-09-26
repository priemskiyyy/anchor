import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const ISSUER = "https://anchor.okta.com/oauth2/default";

const identity = (
  authority: string,
  subject: string,
  context: string | null,
) => ({ principal: { authority, subject, tenant: null }, context });

test("the stored ID token is the session's when its issuer, subject and Okta session all match", () => {
  const idToken = {
    idToken: "id",
    claims: { iss: ISSUER, sub: "00u_ada", sid: "idx_1" },
  };

  expect(isSessionUser(idToken, identity(ISSUER, "00u_ada", "idx_1"))).toBe(
    true,
  );
  expect(
    isSessionUser(
      idToken,
      identity("https://anchor.okta.com/oauth2/other", "00u_ada", "idx_1"),
    ),
  ).toBe(false);
  expect(isSessionUser(idToken, identity(ISSUER, "00u_grace", "idx_1"))).toBe(
    false,
  );
  expect(isSessionUser(idToken, identity(ISSUER, "00u_ada", "idx_2"))).toBe(
    false,
  );
  expect(isSessionUser(undefined, identity(ISSUER, "00u_ada", "idx_1"))).toBe(
    false,
  );
});

test("an ID token without a session claim matches a session without a context", () => {
  const idToken = { idToken: "id", claims: { iss: ISSUER, sub: "00u_ada" } };

  expect(isSessionUser(idToken, identity(ISSUER, "00u_ada", null))).toBe(true);
  expect(isSessionUser(idToken, identity(ISSUER, "00u_ada", "idx_1"))).toBe(
    false,
  );
});
