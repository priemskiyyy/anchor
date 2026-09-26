import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";

/**
 * The ID token claims type of a `UserManager`'s users, which a `user` mapper
 * receives.
 *
 * @example
 * ```ts
 * type Profile = OidcProfileOf<UserManager>;
 * ```
 */
export type OidcProfileOf<TManager extends OidcUserManagerLike> = NonNullable<
  Awaited<ReturnType<TManager["getUser"]>>
>["profile"];
