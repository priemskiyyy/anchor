import { Anchor } from "@priemskiyyy/anchor";
import { betterAuth as betterAuthClient } from "@priemskiyyy/anchor-better-auth";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { betterAuth as createAuthServer } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthClient } from "better-auth/client";
import { expect, test } from "vitest";

import { betterAuth } from "src/betterAuth";

const BASE_URL = "http://localhost:3000";

test("one Better Auth session is the same principal, user, guest and impersonation to the client adapter and to the server adapter", async () => {
  const server = createAuthServer({
    baseURL: BASE_URL,
    secret: "anchor-better-auth-parity-test-secret-0123456789",
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });

  // Node's fetch keeps no cookies, so the client's requests carry the ones the server set, as a browser would.
  const cookies = new Map<string, string>();

  const client = createAuthClient({
    baseURL: BASE_URL,
    fetchOptions: {
      customFetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers);

        headers.set("origin", BASE_URL);
        headers.set(
          "cookie",
          [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
        );

        const response = await server.handler(
          new Request(input, { ...init, headers }),
        );

        for (const cookie of response.headers.getSetCookie()) {
          const [pair = ""] = cookie.split(";");
          const separator = pair.indexOf("=");

          cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
        }

        return response;
      },
    },
  });

  const anchor = new Anchor({ adapter: betterAuthClient({ sdk: client }) });

  await anchor.start();
  await client.signUp.email({
    email: "ada@example.com",
    password: "correct-horse-battery-staple",
    name: "Ada",
  });
  await expect.poll(() => anchor.session.get().status).toBe("signed-in");

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const request = new Request("http://localhost:3000/", {
    headers: {
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });

  const { state: requestState } = await getRequestSession(request, {
    adapter: betterAuth({ sdk: server }),
  });

  expect(requestState).toEqual({
    status: "signed-in",
    session: {
      principal: state.session.principal,
      user: state.session.user,
      guest: state.session.guest,
      impersonated: state.session.impersonated,
    },
  });
  anchor.dispose();
});
