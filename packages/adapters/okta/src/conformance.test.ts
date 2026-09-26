import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakeOktaAuth } from "src/fakeOktaAuth.fixture";
import { okta } from "src/okta";

testSessionAdapter({
  name: "okta",
  createFixture: () => {
    const fake = createFakeOktaAuth();

    return {
      adapter: okta({ sdk: fake.sdk, tokens: { api: accessToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: async (sub) => {
        await fake.signIn(sub);
      },
      signOut: () => fake.sdk.tokenManager.clear(),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (sub) => fake.switchSilently(sub),
    };
  },
});
