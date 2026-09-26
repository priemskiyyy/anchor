import type { SupabaseCookieOptions } from "src/types/SupabaseCookieOptions";

/**
 * The cookie methods the adapter gives the server client it has you create
 * for each request: `getAll` answers the request's cookies, and `setAll`
 * writes the cookies Supabase sets, with the cache headers it sends beside
 * them, into the response's headers.
 *
 * @example
 * ```ts
 * const sdk = (cookies: SupabaseCookieMethods) => createServerClient(url, anonKey, { cookies });
 * ```
 */
export type SupabaseCookieMethods = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options: SupabaseCookieOptions }[],
    headers: Record<string, string>,
  ) => void;
};
