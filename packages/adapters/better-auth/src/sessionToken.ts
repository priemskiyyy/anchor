import type { BetterAuthSessionToken } from "src/types/BetterAuthSessionToken";
import { SESSION_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the token of the Better Auth session the client
 * holds, refreshing the session first when the caller asks for `forceRefresh`.
 * Your API accepts it as `Authorization: Bearer` through Better Auth's
 * `bearer()` plugin.
 *
 * @example
 * ```ts
 * const adapter = betterAuth({ sdk: authClient, tokens: { api: sessionToken() } });
 * ```
 */
export const sessionToken = (): BetterAuthSessionToken => SESSION_TOKEN_PROFILE;
