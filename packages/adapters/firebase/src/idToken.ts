import type { FirebaseIdToken } from "src/types/FirebaseIdToken";
import { ID_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the signed-in user's Firebase ID token through
 * `user.getIdToken()`, forced when the caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = firebase({ sdk: getAuth(app), tokens: { api: idToken() } });
 * ```
 */
export const idToken = (): FirebaseIdToken => ID_TOKEN_PROFILE;
