import type { OktaAuthLike } from "src/types/OktaAuthLike";

/**
 * The ID token claims type of an `OktaAuth` instance's token manager, which a
 * `user` mapper receives.
 *
 * @example
 * ```ts
 * type Claims = OktaClaimsOf<OktaAuth>;
 * ```
 */
export type OktaClaimsOf<TAuth extends OktaAuthLike> = NonNullable<
  ReturnType<TAuth["tokenManager"]["getTokensSync"]>["idToken"]
>["claims"];
