import type { KeycloakSessionUser } from "src/types/KeycloakSessionUser";
import type { KeycloakTokenParsedLike } from "src/types/KeycloakTokenParsedLike";

export const getKeycloakSessionUser = (
  claims: KeycloakTokenParsedLike,
): KeycloakSessionUser => ({
  sub: claims.sub ?? null,
  name: claims.name ?? null,
  preferred_username: claims.preferred_username ?? null,
  given_name: claims.given_name ?? null,
  family_name: claims.family_name ?? null,
  email: claims.email ?? null,
  email_verified: claims.email_verified ?? null,
});
