import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { supabase } from "src/supabase";

testSessionAdapter({
  name: "supabase",
  createFixture: () => {
    const fake = createFakeSupabase();

    return {
      adapter: supabase({ sdk: fake.sdk, tokens: { api: accessToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (id) => fake.signIn(id),
      signOut: async () => {
        await fake.sdk.auth.signOut({ scope: "local" });
      },
      listeners: () => fake.listeners.size,
      observes: true,
      switchSilently: (id) => fake.switchSilently(id),
    };
  },
});
