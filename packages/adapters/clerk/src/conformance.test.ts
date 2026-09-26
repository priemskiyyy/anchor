import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { clerk } from "src/clerk";
import { createFakeClerk } from "src/fakeClerk.fixture";
import { sessionToken } from "src/sessionToken";

testSessionAdapter({
  name: "clerk",
  createFixture: () => {
    const fake = createFakeClerk();

    return {
      adapter: clerk({ sdk: fake.sdk, tokens: { api: sessionToken() } }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (subject) => {
        fake.signIn(subject);
      },
      signOut: () => fake.endElsewhere(),
      listeners: () => fake.listeners(),
      observes: true,
      switchSilently: (subject) => {
        fake.switchSilently(subject);
      },
    };
  },
});
