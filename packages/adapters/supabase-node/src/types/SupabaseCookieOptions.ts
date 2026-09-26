/**
 * The attributes Supabase gives a cookie it sets, under the names of the
 * `cookie` package's `SerializeOptions`, which the adapter writes into the
 * response's `Set-Cookie` header as that package serializes them.
 *
 * @example
 * ```ts
 * const options: SupabaseCookieOptions = { path: "/", sameSite: "lax", maxAge: 34_560_000 };
 * ```
 */
export type SupabaseCookieOptions = {
  /** Encodes the value; `encodeURIComponent` by default. */
  encode?: (value: string) => string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  partitioned?: boolean;
  priority?: "low" | "medium" | "high";
  /** `true` is `Strict`, `false` leaves the attribute out. */
  sameSite?: boolean | "lax" | "strict" | "none";
};
