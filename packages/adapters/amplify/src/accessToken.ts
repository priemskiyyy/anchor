import type { AmplifyAccessToken } from "src/types/AmplifyAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the session's Cognito access token through
 * `fetchAuthSession()`, which refreshes it when it expired and whenever the
 * caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = amplify({ sdk: { auth, hub: Hub }, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): AmplifyAccessToken => ACCESS_TOKEN_PROFILE;
