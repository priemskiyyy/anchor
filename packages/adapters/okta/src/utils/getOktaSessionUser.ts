import type { OktaClaimsLike } from "src/types/OktaClaimsLike";
import type { OktaSessionUser } from "src/types/OktaSessionUser";

export const getOktaSessionUser = (
  claims: OktaClaimsLike,
): OktaSessionUser => ({
  sub: claims.sub ?? null,
  name: claims.name ?? null,
  preferred_username: claims.preferred_username ?? null,
  given_name: claims.given_name ?? null,
  family_name: claims.family_name ?? null,
  email: claims.email ?? null,
  email_verified: claims.email_verified ?? null,
});
