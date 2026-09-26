import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakeUserManager } from "src/fakeUserManager.fixture";
import { oidc } from "src/oidc";

testSessionAdapter({
  name: "oidc",
  createFixture: () => {
    const fake = createFakeUserManager();

    return {
      adapter: oidc({ sdk: fake.sdk, tokens: { api: accessToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (sub) => fake.signIn(sub),
      signOut: () => fake.sdk.removeUser(),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (sub) => fake.switchSilently(sub),
    };
  },
});
