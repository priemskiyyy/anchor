import { Anchor } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";
import { betterAuth as createAuthServer } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthClient } from "better-auth/client";
import { expect, test } from "vitest";

import { betterAuth } from "src/betterAuth";

const BASE_URL = "http://localhost:3000";

const createAuthServerClient = () => {
  const server = createAuthServer({
    baseURL: BASE_URL,
    secret: "anchor-better-auth-sdk-test-secret-0123456789",
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });

  // Node's fetch keeps no cookies, so the client's requests carry the ones the server set, as a browser would.
  const cookies = new Map<string, string>();

  const storeCookies = (response: Response) => {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = cookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);

      if (attributes.some((attribute) => /^\s*max-age=0$/i.test(attribute))) {
        cookies.delete(name);
      } else {
        cookies.set(name, pair.slice(separator + 1));
      }
    }
  };

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

        storeCookies(response);

        return response;
      },
    },
  });

  return { client, cookies };
};

const getSubject = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => (state.status === "signed-in" ? state.session.principal.subject : null);

test("the real Better Auth client and server: a sign-up reaches the session through the atom, and ending signs it out on the server", async () => {
  const { client, cookies } = createAuthServerClient();
  const anchor = new Anchor({ adapter: betterAuth({ sdk: client }) });

  await anchor.start();

  expect(anchor.native).toBe(client);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const { data, error } = await client.signUp.email({
    email: "ada@example.com",
    password: "correct-horse-battery-staple",
    name: "Ada",
  });

  expect(error).toBe(null);
  await expect.poll(() => getSubject(anchor.session.get())).toBe(data?.user.id);

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  expect(state.session.user).toEqual({
    id: data?.user.id,
    name: "Ada",
    email: "ada@example.com",
    emailVerified: false,
    image: null,
  });
  expect(state.session.guest).toBe(false);
  expect(state.session.impersonated).toBe(false);

  await expect(state.session.end()).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(cookies.size).toBe(0);
  await expect(client.getSession()).resolves.toMatchObject({
    data: null,
    error: null,
  });

  anchor.dispose();
});
