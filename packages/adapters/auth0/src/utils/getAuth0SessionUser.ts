import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";
import type { Auth0SessionUser } from "src/types/Auth0SessionUser";

export const getAuth0SessionUser = (
  claims: Auth0ClaimsLike,
): Auth0SessionUser => ({
  sub: claims.sub ?? null,
  name: claims.name ?? null,
  nickname: claims.nickname ?? null,
  picture: claims.picture ?? null,
  email: claims.email ?? null,
  email_verified: claims.email_verified ?? null,
});
