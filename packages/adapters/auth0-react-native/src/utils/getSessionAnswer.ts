import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { Auth0UserLike } from "src/types/Auth0UserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  user: Auth0UserLike | null,
  authority: string,
  mapUser: (user: Auth0UserLike) => TUser,
): SessionAnswer<TUser> => {
  if (user === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    principal: { authority, subject: user.sub, tenant: null },
    user: mapUser(user),
    context: getSessionContext(user),
    guest: false,
    impersonated: user.act !== undefined,
  };
};
