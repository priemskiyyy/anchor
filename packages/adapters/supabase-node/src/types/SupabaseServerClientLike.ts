import type { SupabaseUserLike } from "src/types/SupabaseUserLike";

/**
 * The part of a `@supabase/ssr` server client the adapter calls:
 * `auth.getUser()`, which asks Supabase Auth for the user of the session the
 * request's cookies carry, refreshing that session first when it is about to
 * expire.
 *
 * @example
 * ```ts
 * const client: SupabaseServerClientLike = createServerClient(url, anonKey, { cookies });
 * ```
 */
export type SupabaseServerClientLike = {
  auth: {
    getUser: () => Promise<
      | { data: { user: SupabaseUserLike }; error: null }
      | {
          data: { user: null };
          error: { name: string; code?: string | undefined };
        }
    >;
  };
};
