import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { firebase } from "src/firebase";
import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { idToken } from "src/idToken";

testSessionAdapter({
  name: "firebase",
  createFixture: () => {
    const fake = createFakeFirebaseAuth();

    return {
      adapter: firebase({ sdk: fake.sdk, tokens: { api: idToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (uid) => fake.signIn(uid),
      signOut: () => fake.sdk.signOut(),
      listeners: () => fake.listeners.size,
      observes: true,
      switchSilently: (uid) => fake.switchSilently(uid),
    };
  },
});
