import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { Clerk } from "@clerk/clerk-js";
import { expectTypeOf } from "vitest";

import { clerk } from "src/clerk";
import { sessionToken } from "src/sessionToken";
import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionUser } from "src/types/ClerkSessionUser";
import type { ClerkUserOf } from "src/types/ClerkUserOf";

declare const instance: Clerk;

type UserResource = NonNullable<Clerk["user"]>;

expectTypeOf(instance).toExtend<ClerkLike>();
expectTypeOf<ClerkUserOf<Clerk>>().toEqualTypeOf<UserResource>();

const adapter = clerk({
  sdk: instance,
  tokens: {
    api: sessionToken(),
    supabase: sessionToken({ template: "supabase" }),
  },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<ClerkSessionUser, Clerk, "api" | "supabase">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Clerk>();

const mapped = clerk({
  sdk: instance,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<UserResource>();

    return { id: user.id, role: user.publicMetadata.role };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; role: unknown }, Clerk, never>
>();

// @ts-expect-error The adapter takes the Clerk instance, not the promise its load() returns.
export const wrongSdk = clerk({ sdk: instance.load() });

export const wrongProfile = clerk({
  sdk: instance,
  // @ts-expect-error Clerk mints session tokens only.
  tokens: { api: { kind: "access-token" } },
});
