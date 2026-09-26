import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { createClerkClient } from "@clerk/backend";
import type { ClerkClient, User } from "@clerk/backend";
import type { Clerk } from "@clerk/clerk-js";
import { expectTypeOf } from "vitest";

import { clerk } from "src/clerk";
import type { createFakeClerkBackend } from "src/fakeClerkBackend.fixture";
import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionUser } from "src/types/ClerkSessionUser";
import type { ClerkUserOf } from "src/types/ClerkUserOf";

type FakeSdk = ReturnType<typeof createFakeClerkBackend>["sdk"];

declare const browserClerk: Clerk;

const clerkClient = createClerkClient({
  secretKey: "sk_live_anchor",
  publishableKey: "pk_live_Y2xlcmsuYW5jaG9yLmV4YW1wbGUk",
});

expectTypeOf(clerkClient).toEqualTypeOf<ClerkClient>();
expectTypeOf(clerkClient).toExtend<ClerkLike>();
expectTypeOf<FakeSdk>().toExtend<ClerkLike>();
expectTypeOf<ClerkUserOf<ClerkClient>>().toEqualTypeOf<User>();

expectTypeOf(clerk({ sdk: clerkClient })).toEqualTypeOf<
  ServerSessionAdapter<ClerkSessionUser, ClerkClient>
>();

const mapped = clerk({
  sdk: clerkClient,
  authorizedParties: ["https://app.example.com"],
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.id, locale: user.locale };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  ServerSessionAdapter<{ id: string; locale: string | null }, ClerkClient>
>();

export const browserInstance = clerk({
  // @ts-expect-error The server adapter takes @clerk/backend's client, not the clerk-js instance of the browser.
  sdk: browserClerk,
});

export const onePartyString = clerk({
  sdk: clerkClient,
  // @ts-expect-error Clerk takes the authorized parties as a list of origins.
  authorizedParties: "https://app.example.com",
});
