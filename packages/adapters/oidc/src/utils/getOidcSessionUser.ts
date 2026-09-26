import type { OidcProfileLike } from "src/types/OidcProfileLike";
import type { OidcSessionUser } from "src/types/OidcSessionUser";

export const getOidcSessionUser = (
  profile: OidcProfileLike,
): OidcSessionUser => ({
  sub: profile.sub ?? null,
  name: profile.name ?? null,
  given_name: profile.given_name ?? null,
  family_name: profile.family_name ?? null,
  preferred_username: profile.preferred_username ?? null,
  email: profile.email ?? null,
  email_verified: profile.email_verified ?? null,
  picture: profile.picture ?? null,
});
