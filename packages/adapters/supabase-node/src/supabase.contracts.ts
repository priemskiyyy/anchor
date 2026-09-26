import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { expectTypeOf } from "vitest";

import type { createFakeSupabaseServer } from "src/fakeSupabaseServer.fixture";
import { supabase } from "src/supabase";
import type { SupabaseCookieMethods } from "src/types/SupabaseCookieMethods";
import type { SupabaseCookieOptions } from "src/types/SupabaseCookieOptions";
import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";

const createClient = (cookies: SupabaseCookieMethods) =>
  createServerClient("https://anchor.supabase.co", "anchor-anon-key", {
    cookies,
  });

type Client = ReturnType<typeof createClient>;

type FakeClient = ReturnType<
  ReturnType<typeof createFakeSupabaseServer>["sdk"]
>;

expectTypeOf<Client>().toExtend<SupabaseServerClientLike>();
expectTypeOf<FakeClient>().toExtend<SupabaseServerClientLike>();
expectTypeOf<SupabaseUserOf<Client>>().toEqualTypeOf<User>();
expectTypeOf<SupabaseCookieMethods>().toExtend<CookieMethodsServer>();
expectTypeOf<CookieOptions>().toExtend<SupabaseCookieOptions>();

expectTypeOf(supabase({ sdk: createClient })).toEqualTypeOf<
  ServerSessionAdapter<User, (cookies: SupabaseCookieMethods) => Client>
>();

expectTypeOf(
  supabase({
    sdk: (cookies) =>
      createServerClient("https://anchor.supabase.co", "anchor-anon-key", {
        cookies,
      }),
  }).native,
).toEqualTypeOf<(cookies: SupabaseCookieMethods) => Client>();

const mapped = supabase({
  sdk: createClient,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.id, email: user.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  ServerSessionAdapter<
    { id: string; email: string | undefined },
    (cookies: SupabaseCookieMethods) => Client
  >
>();

export const clientCreatedOnce = supabase({
  // @ts-expect-error The adapter creates each request's client over that request's cookies, so a client created once is refused.
  sdk: createClient({ getAll: () => [], setAll: () => {} }),
});

const createUnverifiedClient = (cookies: SupabaseCookieMethods) => ({
  auth: { getSession: async () => ({ cookies, session: null }) },
});

export const withoutGetUser = supabase({
  // @ts-expect-error A client without auth.getUser() cannot verify the session with Supabase Auth.
  sdk: createUnverifiedClient,
});
