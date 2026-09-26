import type { SupabaseSessionLike } from "src/types/SupabaseSessionLike";

/**
 * The parts of the supabase-js client the adapter calls, all on `auth`. Pass
 * the client `createClient()` returned; the adapter never creates it and
 * never signs anyone in.
 *
 * @example
 * ```ts
 * const sdk: SupabaseClientLike = createClient(url, anonKey);
 * ```
 */
export type SupabaseClientLike = {
  auth: {
    onAuthStateChange: (
      callback: (event: string, session: SupabaseSessionLike | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
    getSession: () => Promise<{
      data: { session: SupabaseSessionLike | null };
      error: unknown;
    }>;
    refreshSession: () => Promise<{
      data: { session: SupabaseSessionLike | null };
      error: unknown;
    }>;
    signOut: (options: { scope: "local" }) => Promise<{ error: unknown }>;
  };
};
