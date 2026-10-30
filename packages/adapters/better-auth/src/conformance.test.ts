import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { betterAuth } from "src/betterAuth";
import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { sessionToken } from "src/sessionToken";

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

testSessionAdapter({
  name: "better-auth with a session token profile",
  createFixture: () => {
    const fake = createFakeBetterAuthClient();

    return {
      adapter: betterAuth({ sdk: fake.sdk, tokens: { api: sessionToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (id) => fake.signIn(id),
      signOut: async () => {
        await fake.sdk.signOut();
      },
      listeners: () => fake.listeners.size,
      observes: true,
      // The token comes from the session atom, so the SDK holds another identity once the atom does.
      switchSilently: async (id) => {
        fake.switchSilently(id);
        await fake.refetch();
      },
    };
  },
});
