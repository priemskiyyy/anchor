import { expect, test } from "vitest";

import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string) => ({
  principal: { authority: "supabase", subject, tenant: null },
  context: null,
});

test("a Supabase session belongs to the Anchor session when its user is the session's subject", () => {
  const fake = createFakeSupabase();

  fake.signIn("ada");

  expect(isSessionUser(fake.current(), identity("ada"))).toBe(true);
  expect(isSessionUser(fake.current(), identity("grace"))).toBe(false);
  expect(isSessionUser(null, identity("ada"))).toBe(false);
});
