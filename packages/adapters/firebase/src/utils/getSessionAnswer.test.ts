import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getSessionAnswer } from "src/utils/getSessionAnswer";

const AUTHORITY = "https://securetoken.google.com/demo";

test("no user is signed out", () => {
  expect(getSessionAnswer(null, AUTHORITY, ({ uid }) => uid)).toEqual({
    status: "signed-out",
  });
});

test("a user is signed in with the uid as subject, its tenant, its guest flag and the mapped user", () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada", { tenantId: "acme", anonymous: true });

  expect(
    getSessionAnswer(fake.current(), AUTHORITY, ({ uid }) => ({ id: uid })),
  ).toEqual({
    status: "signed-in",
    principal: { authority: AUTHORITY, subject: "ada", tenant: "acme" },
    user: { id: "ada" },
    context: null,
    guest: true,
    impersonated: false,
  });
});
