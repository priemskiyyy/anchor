import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";
import { onTestFinished, vi } from "vitest";

import { clerk } from "src/clerk";
import { createClerkServer } from "src/fakeClerkApi.fixture";
import { createFakeClerkBackend } from "src/fakeClerkBackend.fixture";

testServerSessionAdapter({
  name: "clerk-node over the fake Clerk client",
  createFixture: () => {
    const fake = createFakeClerkBackend();

    return {
      adapter: clerk({ sdk: fake.sdk }),
      native: fake.sdk,
      signIn: (name) => {
        fake.signIn(`token_${name}`, `user_${name}`);

        return {
          headers: new Headers({ cookie: `__session=token_${name}` }),
          subject: `user_${name}`,
        };
      },
      // Clerk verifies a session token without asking Clerk, so a session ended elsewhere reads as signed out once its token expires.
      signOut: (headers) => {
        fake.expire((headers.get("cookie") ?? "").slice("__session=".length));
      },
    };
  },
});

testServerSessionAdapter({
  name: "clerk-node over the real @clerk/backend client",
  createFixture: () => {
    const server = createClerkServer();

    return {
      adapter: clerk({ sdk: server.sdk }),
      native: server.sdk,
      signIn: (name) => {
        const { userId, cookie } = server.signUp(name);

        return { headers: new Headers({ cookie }), subject: userId };
      },
      // Clerk verifies a session token without asking Clerk, so a session ended elsewhere reads as signed out once its token, a minute long, expires.
      signOut: () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 120_000);
        onTestFinished(() => {
          vi.useRealTimers();
        });
      },
    };
  },
});
