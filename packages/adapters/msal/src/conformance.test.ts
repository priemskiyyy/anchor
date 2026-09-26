import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakePublicClientApplication } from "src/fakePublicClientApplication.fixture";
import { msal } from "src/msal";

testSessionAdapter({
  name: "msal",
  createFixture: () => {
    const fake = createFakePublicClientApplication();

    return {
      adapter: msal({
        sdk: fake.sdk,
        tokens: { graph: accessToken({ scopes: ["User.Read"] }) },
      }),
      native: fake.sdk,
      profiles: ["graph"],
      signIn: (homeAccountId) => {
        fake.signIn(homeAccountId);
      },
      signOut: () => fake.sdk.setActiveAccount(null),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (homeAccountId) => {
        fake.switchSilently(homeAccountId);
      },
    };
  },
});
