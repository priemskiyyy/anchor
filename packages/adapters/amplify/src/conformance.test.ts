import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { amplify } from "src/amplify";
import { createFakeAmplifyAuth } from "src/fakeAmplifyAuth.fixture";
import { idToken } from "src/idToken";

testSessionAdapter({
  name: "amplify",
  createFixture: () => {
    const fake = createFakeAmplifyAuth();

    return {
      adapter: amplify({
        sdk: fake.sdk,
        tokens: { api: accessToken(), identity: idToken() },
      }),
      native: fake.sdk,
      profiles: ["api", "identity"],
      signIn: (sub) => fake.signIn(sub),
      signOut: () => fake.sdk.auth.signOut({ global: false }),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (sub) => fake.switchSilently(sub),
    };
  },
});
