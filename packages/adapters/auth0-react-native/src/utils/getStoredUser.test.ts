import { expect, test } from "vitest";

import { createFakeAuth0 } from "src/fakeAuth0.fixture";
import { getStoredUser } from "src/utils/getStoredUser";

test("the stored ID token is read with the parseIdToken given, and no credentials is no user", async () => {
  const fake = createFakeAuth0();

  await expect(getStoredUser(fake.sdk, fake.parseIdToken)).resolves.toBe(null);

  fake.login("auth0|ada", { org: "org_acme" });

  await expect(
    getStoredUser(fake.sdk, fake.parseIdToken),
  ).resolves.toMatchObject({ sub: "auth0|ada", org_id: "org_acme" });

  const parsed: string[] = [];

  await getStoredUser(fake.sdk, (idToken) => {
    parsed.push(idToken);

    return { sub: "auth0|ada" };
  });

  expect(parsed).toEqual([fake.stored()?.idToken]);
});
