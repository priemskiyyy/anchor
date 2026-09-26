import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { KeycloakTokenParsedLike } from "src/types/KeycloakTokenParsedLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  claims: KeycloakTokenParsedLike | undefined,
  mapUser: (claims: KeycloakTokenParsedLike) => TUser,
): SessionAnswer<TUser> => {
  if (claims === undefined) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    // An access token without iss or sub answers them empty, which the core refuses as INVALID_ANSWER.
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
