import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { OktaAuthStateLike } from "src/types/OktaAuthStateLike";
import type { OktaClaimsLike } from "src/types/OktaClaimsLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  authState: OktaAuthStateLike,
  mapUser: (claims: OktaClaimsLike) => TUser,
): SessionAnswer<TUser> => {
  if (authState.error !== undefined) {
    throw authState.error;
  }

  // okta-auth-js also counts the session as unauthenticated after a renewal it could not complete, offline for one, while its refresh token may still renew it.
  if (
    authState.isAuthenticated !== true &&
    authState.refreshToken !== undefined
  ) {
    throw new Error(
      "okta-auth-js holds a refresh token but no tokens it can use: it could not renew them.",
    );
  }

  if (authState.isAuthenticated !== true) {
    return SIGNED_OUT_ANSWER;
  }

  const claims = authState.idToken?.claims;

  if (claims === undefined) {
    throw new TypeError(
      "okta-auth-js counts the session as authenticated but holds no ID token to name it: request the openid scope.",
    );
  }

  return {
    status: "signed-in",
    // An ID token without iss or sub answers them empty, which the core refuses as INVALID_ANSWER.
    principal: {
      authority: claims.iss ?? "",
      subject: claims.sub ?? "",
      tenant: null,
    },
    user: mapUser(claims),
    context: getSessionContext(claims),
    guest: false,
    impersonated: false,
  };
};
