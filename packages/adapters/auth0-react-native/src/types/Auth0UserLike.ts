/**
 * The parts of the react-native-auth0 `User` that `parseIdToken` builds from
 * an ID token which the adapter reads: the subject that names the principal,
 * the organization that fingerprints its context, the actor of an
 * impersonation, and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const user: Auth0UserLike = parseIdToken(credentials.idToken);
 * ```
 */
export type Auth0UserLike = {
  sub: string;
  /** The organization the login chose, which `parseIdToken` keeps under its claim name. */
  org_id?: string;
  /** The actor of an impersonation or delegation, as RFC 8693 names it. */
  act?: unknown;
  name?: string;
  nickname?: string;
  picture?: string;
  email?: string;
  emailVerified?: boolean;
};
