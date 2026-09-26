import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { getSessionAtom } from "src/utils/getSessionAtom";

test("the session atom is the one in the client's store", () => {
  const fake = createFakeBetterAuthClient();

  expect(getSessionAtom(fake.sdk)).toBe(fake.sdk.$store.atoms.session);
});

test("a client without a session atom is refused", () => {
  const fake = createFakeBetterAuthClient();

  expect(() => getSessionAtom({ ...fake.sdk, $store: { atoms: {} } })).toThrow(
    new TypeError(
      "The Better Auth client has no session atom: pass the client createAuthClient() returned.",
    ),
  );
});
