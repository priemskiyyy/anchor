import type { SupabaseAccessToken } from "src/types/SupabaseAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the session's Supabase access token, refreshed
 * through `auth.refreshSession()` when the caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = supabase({ sdk: supabaseClient, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): SupabaseAccessToken => ACCESS_TOKEN_PROFILE;
