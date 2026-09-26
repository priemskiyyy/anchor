import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { AmplifyJwtLike } from "src/types/AmplifyJwtLike";
import type { AmplifyUserLike } from "src/types/AmplifyUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  session: { user: AmplifyUserLike; idToken: AmplifyJwtLike } | null,
  mapUser: (user: AmplifyUserLike) => TUser,
): SessionAnswer<TUser> => {
  if (session === null) {
    return SIGNED_OUT_ANSWER;
  }

  const { payload } = session.idToken;

  return {
    status: "signed-in",
    // An ID token without iss or sub answers them empty, which the core refuses as INVALID_ANSWER.
    principal: {
      authority: payload.iss ?? "",
      subject: payload.sub ?? "",
      tenant: null,
    },
    user: mapUser(session.user),
    context: getSessionContext(payload),
    guest: false,
    impersonated: false,
  };
};
