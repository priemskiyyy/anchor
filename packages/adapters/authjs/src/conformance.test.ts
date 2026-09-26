// @vitest-environment jsdom
import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { authjs } from "src/authjs";
import {
  countStorageListeners,
  createFakeNextAuthReact,
} from "src/fakeNextAuthReact.fixture";

testSessionAdapter({
  name: "authjs",
  createFixture: () => {
    const fake = createFakeNextAuthReact();

    return {
      adapter: authjs({ sdk: fake.sdk }),
      native: fake.sdk,
      profiles: [],
      signIn: (subject) => fake.signIn(subject),
      signOut: async () => {
        await fake.sdk.signOut({ redirect: false });
      },
      listeners: countStorageListeners(),
      observes: false,
    };
  },
});
