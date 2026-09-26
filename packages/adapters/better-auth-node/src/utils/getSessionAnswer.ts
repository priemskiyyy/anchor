import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { BETTER_AUTH_AUTHORITY } from "src/utils/constants/betterAuth";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  data: BetterAuthSessionLike | null,
  mapUser: (user: BetterAuthSessionLike["user"]) => TUser,
): SessionAnswer<TUser> => {
  if (data === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    principal: {
      authority: BETTER_AUTH_AUTHORITY,
      subject: data.user.id,
      tenant: null,
    },
    user: mapUser(data.user),
    context: getSessionContext(data),
    guest: data.user.isAnonymous === true,
    impersonated: typeof data.session.impersonatedBy === "string",
  };
};
