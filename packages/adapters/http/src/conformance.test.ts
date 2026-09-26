import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { createFakeBackend } from "src/fakeBackend.fixture";
import { http } from "src/http";

testSessionAdapter({
  name: "http",
  createFixture: () => {
    const backend = createFakeBackend();

    return {
      adapter: http({
        authority: "https://api.example.com",
        read: backend.client.getSession,
        end: backend.client.endSession,
        tokens: { api: backend.client.mintToken },
      }),
      native: null,
      profiles: ["api"],
      signIn: (id) => backend.signIn(id),
      signOut: () => backend.signOut(),
      listeners: () => 0,
      observes: false,
      switchSilently: (id) => backend.signIn(id),
    };
  },
});
