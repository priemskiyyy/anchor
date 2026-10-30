import { Anchor } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";
import { expo } from "@better-auth/expo";
import { expoClient } from "@better-auth/expo/client";
import { betterAuth as createAuthServer } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthClient } from "better-auth/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { betterAuth } from "src/betterAuth";

// Only the native modules the Expo plugin imports are replaced; the plugin itself, the client and the server are real.
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
}));

vi.mock("expo-constants", () => ({ default: { expoConfig: {} } }));

vi.mock("expo-linking", () => ({
  createURL: (path: string) => `anchor://${path}`,
}));

vi.mock("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: () => {} }),
}));

const BASE_URL = "http://localhost:3000";

// expo-secure-store's four calls, over memory, so a new client after a restart finds what the last one stored.
const createSecureStore = () => {
  const items = new Map<string, string>();

  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

const createDevice = () => {
  const server = createAuthServer({
    baseURL: BASE_URL,
    secret: "anchor-better-auth-expo-test-secret-0123456789",
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    trustedOrigins: ["anchor://"],
    plugins: [expo()],
    logger: { disabled: true },
  });

  const storage = createSecureStore();
  const network = { online: true, hang: false };

  // No cookie jar: on React Native the Expo plugin carries the cookie from secure storage itself.
  const createClient = () =>
    createAuthClient({
      baseURL: BASE_URL,
      plugins: [
        expoClient({ scheme: "anchor", storagePrefix: "anchor", storage }),
      ],
      fetchOptions: {
        customFetchImpl: async (input, init) => {
          if (!network.online) {
            throw new TypeError("Network request failed");
          }

          if (network.hang) {
            await new Promise(() => {});
          }

          return server.handler(new Request(input, init));
        },
      },
    });

  return { storage, network, createClient };
};

const getSubject = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => (state.status === "signed-in" ? state.session.principal.subject : null);

beforeEach(() => {
  // React Native has a window, without the DOM's events.
  vi.stubGlobal("window", globalThis);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("on React Native with the Expo plugin: a sign-up reaches the session, a restart finds it in secure storage, and ending clears the stored cookie", async () => {
  const device = createDevice();
  const client = device.createClient();
  const anchor = new Anchor({ adapter: betterAuth({ sdk: client }) });

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const { data } = await client.signUp.email({
    email: "ada@example.com",
    password: "correct-horse-battery-staple",
    name: "Ada",
  });

  await expect.poll(() => getSubject(anchor.session.get())).toBe(data?.user.id);
  anchor.dispose();

  const restarted = new Anchor({
    adapter: betterAuth({ sdk: device.createClient() }),
  });

  await restarted.start();

  const state = restarted.session.get();

  expect(getSubject(state)).toBe(data?.user.id);

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(state.session.end()).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(restarted.session.get()).toEqual({ status: "signed-out" });
  expect(device.storage.items.get("anchor_cookie")).toBe("{}");
  restarted.dispose();
});

test("on React Native offline: a restart answers the session the Expo plugin cached, and ending clears it on the device while the server's side stays unknown", async () => {
  const device = createDevice();
  const client = device.createClient();
  const anchor = new Anchor({ adapter: betterAuth({ sdk: client }) });

  await anchor.start();

  const { data } = await client.signUp.email({
    email: "grace@example.com",
    password: "correct-horse-battery-staple",
    name: "Grace",
  });

  await expect.poll(() => getSubject(anchor.session.get())).toBe(data?.user.id);
  anchor.dispose();
  device.network.online = false;

  const offline = new Anchor({
    adapter: betterAuth({ sdk: device.createClient() }),
  });

  await offline.start();

  const state = offline.session.get();

  expect(getSubject(state)).toBe(data?.user.id);

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(state.session.end()).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(offline.session.get()).toEqual({ status: "signed-out" });
  offline.dispose();
  device.network.online = true;

  const online = new Anchor({
    adapter: betterAuth({ sdk: device.createClient() }),
  });

  await online.start();

  expect(online.session.get()).toEqual({ status: "signed-out" });
  online.dispose();
});

test("on React Native with a confirmation timeout: a restart on a network that never answers shows the session the Expo plugin cached once the timeout passes", async () => {
  const device = createDevice();
  const client = device.createClient();
  const anchor = new Anchor({ adapter: betterAuth({ sdk: client }) });

  await anchor.start();

  const { data } = await client.signUp.email({
    email: "hopper@example.com",
    password: "correct-horse-battery-staple",
    name: "Hopper",
  });

  await expect.poll(() => getSubject(anchor.session.get())).toBe(data?.user.id);
  anchor.dispose();
  device.network.hang = true;

  const restarted = new Anchor({
    adapter: betterAuth({
      sdk: device.createClient(),
      confirmation: { timeout: 50 },
    }),
  });

  restarted.start().catch(() => {});

  await expect
    .poll(() => getSubject(restarted.session.get()))
    .toBe(data?.user.id);
  restarted.dispose();
});

test("on React Native without a confirmation timeout: the same restart waits for the network and shows no session", async () => {
  const device = createDevice();
  const client = device.createClient();
  const anchor = new Anchor({ adapter: betterAuth({ sdk: client }) });

  await anchor.start();

  const { data } = await client.signUp.email({
    email: "turing@example.com",
    password: "correct-horse-battery-staple",
    name: "Turing",
  });

  await expect.poll(() => getSubject(anchor.session.get())).toBe(data?.user.id);
  anchor.dispose();
  device.network.hang = true;

  const restarted = new Anchor({
    adapter: betterAuth({ sdk: device.createClient() }),
  });

  restarted.start().catch(() => {});
  await new Promise((resolve) => {
    setTimeout(resolve, 200);
  });

  expect(restarted.session.get().status).toBe("initializing");
  restarted.dispose();
});
