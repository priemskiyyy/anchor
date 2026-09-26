import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakeKeycloak } from "src/fakeKeycloak.fixture";
import { keycloak } from "src/keycloak";

testSessionAdapter({
  name: "keycloak",
  createFixture: () => {
    const fake = createFakeKeycloak();

    return {
      adapter: keycloak({
        sdk: fake.sdk,
        initialized: fake.initialized,
        tokens: { api: accessToken() },
      }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (sub) => fake.login(sub),
      signOut: () => fake.sdk.clearToken(),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (sub) => fake.switchSilently(sub),
    };
  },
});
