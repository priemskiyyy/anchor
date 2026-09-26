import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import { AUTH0_DOMAIN, createFakeAuth0 } from "src/fakeAuth0.fixture";

testSessionAdapter({
  name: "auth0-react-native",
  createFixture: () => {
    const fake = createFakeAuth0();

    return {
      adapter: auth0({
        sdk: fake.sdk,
        domain: AUTH0_DOMAIN,
        parseIdToken: fake.parseIdToken,
        tokens: {
          api: accessToken({ audience: "https://api.example.com" }),
          login: accessToken(),
        },
      }),
      native: fake.sdk,
      profiles: ["api", "login"],
      signIn: (sub) => fake.login(sub),
      signOut: () => fake.sdk.credentialsManager.clearCredentials(),
      listeners: () => 0,
      observes: false,
      switchSilently: (sub) => fake.login(sub),
    };
  },
});
