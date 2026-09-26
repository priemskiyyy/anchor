import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";
import { onTestFinished, vi } from "vitest";

import { createWorkosServer } from "src/fakeWorkosApi.fixture";
import { COOKIE_PASSWORD, createFakeWorkos } from "src/fakeWorkos.fixture";
import { workos } from "src/workos";

const getSealedSession = (headers: Headers) =>
  (headers.get("cookie") ?? "").slice("wos-session=".length);

testServerSessionAdapter({
  name: "workos-node over the fake WorkOS client",
  createFixture: () => {
    const fake = createFakeWorkos();

    return {
      adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }),
      native: fake.sdk,
      signIn: (name) => {
        fake.signIn(`sealed_${name}`, `user_${name}`);

        return {
          headers: new Headers({ cookie: `wos-session=sealed_${name}` }),
          subject: `user_${name}`,
        };
      },
      // WorkOS verifies an access token without asking WorkOS, so a session ended elsewhere reads as signed out once its token expires and the refresh is refused.
      signOut: (headers) => {
        fake.expire(getSealedSession(headers));
        fake.failures.refresh = {
          authenticated: false,
          reason: "invalid_grant",
          retryable: false,
        };
      },
    };
  },
});

testServerSessionAdapter({
  name: "workos-node over the real @workos-inc/node client",
  createFixture: () => {
    const server = createWorkosServer();
    const users = new Map<string, string>();

    return {
      adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }),
      native: server.sdk,
      signIn: async (name) => {
        const { userId, cookie } = await server.signUp(name);

        users.set(cookie, userId);

        return { headers: new Headers({ cookie }), subject: userId };
      },
      // WorkOS verifies an access token without asking WorkOS, so a session ended elsewhere reads as signed out once its five-minute token expires and the refresh is refused.
      signOut: (headers) => {
        server.end(users.get(headers.get("cookie") ?? "") ?? "");
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 600_000);
        onTestFinished(() => {
          vi.useRealTimers();
        });
      },
    };
  },
});
