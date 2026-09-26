import type { Auth0SessionUser } from "src/types/Auth0SessionUser";
import type { Auth0UserLike } from "src/types/Auth0UserLike";

export const getAuth0SessionUser = (user: Auth0UserLike): Auth0SessionUser => ({
  sub: user.sub,
  name: user.name ?? null,
  nickname: user.nickname ?? null,
  picture: user.picture ?? null,
  email: user.email ?? null,
  emailVerified: user.emailVerified ?? null,
});
