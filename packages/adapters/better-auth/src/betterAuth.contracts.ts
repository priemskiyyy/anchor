import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import { expoClient } from "@better-auth/expo/client";
import type { betterAuth as createAuthServer } from "better-auth";
import { createAuthClient as createVanillaClient } from "better-auth/client";
import {
  adminClient,
  anonymousClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { expectTypeOf } from "vitest";

import { betterAuth } from "src/betterAuth";
import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";

const client = createAuthClient({
  plugins: [organizationClient(), anonymousClient(), adminClient()],
});

const vanillaClient = createVanillaClient();

declare const secureStore: Parameters<typeof expoClient>[0]["storage"];

// An Expo application's client: the React client with the Expo plugin.
const expoAppClient = createAuthClient({
  plugins: [expoClient({ scheme: "anchor", storage: secureStore })],
});

type Client = typeof client;

declare const server: ReturnType<typeof createAuthServer>;

expectTypeOf(client).toExtend<BetterAuthClientLike>();
expectTypeOf(vanillaClient).toExtend<BetterAuthClientLike>();
expectTypeOf(expoAppClient).toExtend<BetterAuthClientLike>();
expectTypeOf(betterAuth({ sdk: expoAppClient })).toEqualTypeOf<
  SessionAdapter<BetterAuthSessionUser, typeof expoAppClient, never>
>();
expectTypeOf<BetterAuthUserOf<Client>>().toEqualTypeOf<
  Client["$Infer"]["Session"]["user"]
>();

const adapter = betterAuth({ sdk: client });

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<BetterAuthSessionUser, Client, never>
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Client>();

const mapped = betterAuth({
  sdk: client,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<Client["$Infer"]["Session"]["user"]>();

    return { id: user.id, role: user.role, anonymous: user.isAnonymous };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<
    {
      id: string;
      role: string | null | undefined;
      anonymous: boolean | null | undefined;
    },
    Client,
    never
  >
>();

// @ts-expect-error The adapter takes the client, not the server's auth instance.
export const wrongSdk = betterAuth({ sdk: server });

// @ts-expect-error Better Auth sessions are cookies, so the adapter declares no token profiles.
export const wrongProfile = betterAuth({ sdk: client, tokens: { api: {} } });
