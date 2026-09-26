import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string, tenant: string | null = null) => ({
  principal: {
    authority: "https://securetoken.google.com/demo",
    subject,
    tenant,
  },
  context: null,
});

test("the SDK's user is the session's when the uid and the tenant both match", () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada", { tenantId: "acme" });

  expect(isSessionUser(fake.current(), identity("ada", "acme"))).toBe(true);
  expect(isSessionUser(fake.current(), identity("ada"))).toBe(false);
  expect(isSessionUser(fake.current(), identity("grace", "acme"))).toBe(false);
  expect(isSessionUser(null, identity("ada"))).toBe(false);
});
