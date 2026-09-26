import { expect, test } from "vitest";

import {
  END_SESSION_ENDPOINT,
  OIDC_ISSUER,
  createFakeUserManager,
} from "src/fakeUserManager.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: OIDC_ISSUER, subject, tenant: null },
    context: '[null,null,"sid_1",null]',
  },
  signal: new AbortController().signal,
});

test("the session's own user is removed and the end-session page is handed back", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: { url: `${END_SESSION_ENDPOINT}?id_token_hint=id.ada.1` },
  });
  expect(fake.stored()).toBe(null);
});

test("another user is never removed: the ending does not apply", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.stored()?.profile.sub).toBe("grace");
});

test("no end-session endpoint means no remote step, and metadata that fails leaves it unknown", async () => {
  const withoutEndpoint = createFakeUserManager({ endSessionEndpoint: null });

  await withoutEndpoint.signIn("ada");

  await expect(
    signOutSession(withoutEndpoint.sdk, request("ada")),
  ).resolves.toEqual({
    local: "completed",
    remote: "not-applicable",
    navigation: null,
  });

  const failing = createFakeUserManager();

  await failing.signIn("ada");
  failing.failures.metadata = new TypeError("fetch failed");

  await expect(signOutSession(failing.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(failing.stored()).toBe(null);
});
