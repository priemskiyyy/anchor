import { expect, test } from "vitest";

import { createFakeAuth0 } from "src/fakeAuth0.fixture";
import { getStoredCredentials } from "src/utils/getStoredCredentials";

test("valid credentials are answered as the credentials manager stores them", async () => {
  const fake = createFakeAuth0();

  fake.login("auth0|ada");

  await expect(getStoredCredentials(fake.sdk)).resolves.toEqual(fake.stored());
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
  ]);
});

test("no valid credentials is none, without asking for them", async () => {
  const fake = createFakeAuth0();

  await expect(getStoredCredentials(fake.sdk)).resolves.toBe(null);
  expect(fake.calls).toEqual([["hasValidCredentials", undefined]]);
});

test("credentials gone by the time they are asked for are none, and any other failure is thrown", async () => {
  const fake = createFakeAuth0();

  fake.login("auth0|ada");

  const sdk = {
    credentialsManager: {
      ...fake.sdk.credentialsManager,
      hasValidCredentials: async () => true,
    },
  };

  await fake.sdk.credentialsManager.clearCredentials();

  await expect(getStoredCredentials(sdk)).resolves.toBe(null);

  const refused = Object.assign(new Error("RENEW_FAILED"), {
    type: "RENEW_FAILED",
  });

  fake.login("auth0|ada");
  fake.expire();
  fake.failures.renew = refused;

  await expect(getStoredCredentials(fake.sdk)).rejects.toBe(refused);
});
