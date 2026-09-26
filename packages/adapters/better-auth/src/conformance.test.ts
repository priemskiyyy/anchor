import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { betterAuth } from "src/betterAuth";
import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";

testSessionAdapter({
  name: "better-auth",
  createFixture: () => {
    const fake = createFakeBetterAuthClient();

    return {
      adapter: betterAuth({ sdk: fake.sdk }),
      native: fake.sdk,
      profiles: [],
      signIn: (id) => fake.signIn(id),
      signOut: async () => {
        await fake.sdk.signOut();
      },
      listeners: () => fake.listeners.size,
      observes: true,
      switchSilently: (id) => fake.switchSilently(id),
    };
  },
});
