import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { supabase } from "src/supabase";
import type { SupabaseClientLike } from "src/types/SupabaseClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";

declare const client: SupabaseClient;

expectTypeOf(client).toExtend<SupabaseClientLike>();
expectTypeOf<SupabaseUserOf<SupabaseClient>>().toEqualTypeOf<User>();

const adapter = supabase({ sdk: client, tokens: { api: accessToken() } });

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<User, SupabaseClient, "api">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<SupabaseClient>();

const mapped = supabase({
  sdk: client,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.id, email: user.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<
    { id: string; email: string | undefined },
    SupabaseClient,
    never
  >
>();

// @ts-expect-error The adapter takes the client, not its auth namespace.
export const wrongSdk = supabase({ sdk: client.auth });

export const wrongProfile = supabase({
  sdk: client,
  // @ts-expect-error Supabase mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
