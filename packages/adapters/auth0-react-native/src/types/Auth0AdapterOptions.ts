import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import type { Auth0UserOf } from "src/types/Auth0UserOf";

/**
 * Options of `auth0()`: the application's react-native-auth0 client, the
 * domain it was created with, react-native-auth0's own `parseIdToken`, an
 * optional mapper from its user to the plain data a session carries, and the
 * token profiles.
 *
 * @example
 * ```ts
 * const options: Auth0AdapterOptions<Auth0, typeof parseIdToken, { id: string }, { api: Auth0AccessToken }> = {
 *   sdk: client,
 *   domain: "acme.us.auth0.com",
 *   parseIdToken,
 *   user: (user) => ({ id: user.sub }),
 *   tokens: { api: accessToken({ audience: "https://api.example.com" }) },
 * };
 * ```
 */
export type Auth0AdapterOptions<
  TClient extends Auth0Like,
  TParse extends Auth0IdTokenParserLike,
  TUser,
  TTokens extends Record<string, Auth0AccessToken>,
> = {
  sdk: TClient;
  /** The domain `new Auth0()` was created with; sessions name `https://<domain>/`, the issuer Auth0 writes into the ID tokens it issues there. */
  domain: string;
  /** react-native-auth0's `parseIdToken`, which reads the stored ID token for the adapter. */
  parseIdToken: TParse;
  /** Maps the user `parseIdToken` answers to the plain data a session carries; a snapshot of its profile fields by default. */
  user?: (user: Auth0UserOf<TParse>) => TUser;
  tokens?: TTokens;
};
