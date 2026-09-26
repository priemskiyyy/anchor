import type { OidcAccessToken } from "src/types/OidcAccessToken";
import type { OidcProfileOf } from "src/types/OidcProfileOf";
import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";

/**
 * Options of `oidc()`: the application's oidc-client-ts `UserManager`, an
 * optional mapper from the ID token claims to the plain data a session
 * carries, and the token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: OidcAdapterOptions<UserManager, { id: string }, { api: OidcAccessToken }> = {
 *   sdk: userManager,
 *   user: (profile) => ({ id: profile.sub }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type OidcAdapterOptions<
  TManager extends OidcUserManagerLike,
  TUser,
  TTokens extends Record<string, OidcAccessToken>,
> = {
  sdk: TManager;
  /** Maps the ID token claims of `user.profile` to the plain data a session carries; a snapshot of the profile claims by default. */
  user?: (profile: OidcProfileOf<TManager>) => TUser;
  tokens?: TTokens;
};
