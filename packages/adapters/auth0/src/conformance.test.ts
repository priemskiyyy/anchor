import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import { createFakeAuth0Client } from "src/fakeAuth0Client.fixture";

testSessionAdapter({
  name: "auth0",
  createFixture: () => {
    const fake = createFakeAuth0Client();

    return {
      adapter: auth0({
        sdk: fake.sdk,
        tokens: { api: accessToken({ audience: "https://api.example.com" }) },
      }),
      native: fake.sdk,
      profiles: ["api"],
      signIn: (sub) => fake.login(sub),
      signOut: () => fake.logoutLocally(),
      listeners: () => 0,
      observes: false,
      switchSilently: (sub) => fake.login(sub),
    };
  },
});
