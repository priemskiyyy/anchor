import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";
import { idToken } from "src/idToken";

testSessionAdapter({
  name: "firebase-react-native",
  createFixture: () => {
    const fake = createFakeFirebaseAuth();

    return {
      adapter: firebase({ sdk: fake.sdk, tokens: { api: idToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (uid) => fake.signIn(uid),
      signOut: () => fake.sdk.signOut(),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (uid) => fake.switchSilently(uid),
    };
  },
});
