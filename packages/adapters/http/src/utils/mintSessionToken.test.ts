import { expect, test } from "vitest";

import { createFakeBackend } from "src/fakeBackend.fixture";
import { mintSessionToken } from "src/utils/mintSessionToken";

const request = (profile: string) => ({
  profile,
  forceRefresh: true,
  session: {
    principal: {
      authority: "https://api.example.com",
      subject: "user_ada",
      tenant: null,
    },
    context: '[null,"session_1"]',
  },
  signal: new AbortController().signal,
});

test("the profile's own function mints, with the whole request", async () => {
  const backend = createFakeBackend();
  const sent = request("api");

  backend.signIn("user_ada");

  await expect(
    mintSessionToken({ api: backend.client.mintToken }, sent),
  ).resolves.toEqual({
    value: "api.user_ada.1",
    kind: "access-token",
    scheme: null,
  });
  expect(backend.mints).toEqual([sent]);
});

test("a profile the adapter does not declare is refused", async () => {
  await expect(mintSessionToken({}, request("reports"))).rejects.toMatchObject({
    code: "INVALID_CONFIGURATION",
    message: "The http adapter declares no token profile named reports.",
  });
});
