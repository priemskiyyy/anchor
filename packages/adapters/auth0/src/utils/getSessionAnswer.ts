import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  claims: Auth0ClaimsLike | undefined,
  mapUser: (claims: Auth0ClaimsLike) => TUser,
): SessionAnswer<TUser> => {
  if (claims === undefined) {
    return SIGNED_OUT_ANSWER;
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
    impersonated: claims.act !== undefined,
  };
};
