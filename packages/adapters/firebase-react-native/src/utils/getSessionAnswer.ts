import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { FirebaseUserLike } from "src/types/FirebaseUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";

export const getSessionAnswer = <TUser>(
  user: FirebaseUserLike | null,
  authority: string,
  mapUser: (user: FirebaseUserLike) => TUser,
): SessionAnswer<TUser> => {
  if (user === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    principal: { authority, subject: user.uid, tenant: user.tenantId },
    user: mapUser(user),
    context: null,
    guest: user.isAnonymous,
    impersonated: false,
  };
};
