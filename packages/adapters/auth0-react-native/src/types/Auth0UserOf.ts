import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";

/**
 * The user type the given `parseIdToken` answers, which a `user` mapper
 * receives.
 *
 * @example
 * ```ts
 * type User = Auth0UserOf<typeof parseIdToken>;
 * ```
 */
export type Auth0UserOf<TParse extends Auth0IdTokenParserLike> =
  ReturnType<TParse>;
