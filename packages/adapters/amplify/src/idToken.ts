import type { AmplifyIdToken } from "src/types/AmplifyIdToken";
import { ID_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the session's Cognito ID token through
 * `fetchAuthSession()`, which refreshes it when it expired and whenever the
 * caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = amplify({ sdk: { auth, hub: Hub }, tokens: { identity: idToken() } });
 * ```
 */
export const idToken = (): AmplifyIdToken => ID_TOKEN_PROFILE;
