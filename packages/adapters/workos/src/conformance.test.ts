import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { createFakeAuthKitClient } from "src/fakeAuthKitClient.fixture";
import { workos } from "src/workos";

testSessionAdapter({
  name: "workos",
  createFixture: () => {
    const fake = createFakeAuthKitClient();

    return {
      adapter: workos({
        sdk: fake.sdk,
        refreshes: fake.refreshes,
        tokens: { api: accessToken() },
      }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (subject) => fake.signIn(subject),
      // WorkOS ends the session, and AuthKit's automatic refresh reports it through onRefreshFailure.
      signOut: () => {
        fake.endAtWorkos();
        fake.expire();
        fake.refreshAutomatically();
      },
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (subject) => fake.switchSilently(subject),
    };
  },
});
