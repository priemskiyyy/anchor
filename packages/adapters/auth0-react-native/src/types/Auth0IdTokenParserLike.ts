import type { Auth0UserLike } from "src/types/Auth0UserLike";

/**
 * The shape of react-native-auth0's `parseIdToken`, which the adapter calls to
 * name a session from the stored ID token, so Anchor never decodes a token
 * itself.
 *
 * @example
 * ```ts
 * import { parseIdToken } from "react-native-auth0";
 *
 * const parse: Auth0IdTokenParserLike = parseIdToken;
 * ```
 */
export type Auth0IdTokenParserLike = (idToken: string) => Auth0UserLike;
