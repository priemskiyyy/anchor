/**
 * The default user of a Keycloak session: a plain snapshot of the profile
 * claims of the access token, under Keycloak's names, with `null` for a claim
 * it lacks.
 *
 * @example
 * ```ts
 * const username = state.status === "signed-in" ? state.session.user.preferred_username : null;
 * ```
 */
export type KeycloakSessionUser = {
  sub: string | null;
  name: string | null;
  preferred_username: string | null;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  email_verified: boolean | null;
};
