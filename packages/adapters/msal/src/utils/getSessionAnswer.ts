import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { MsalAccountLike } from "src/types/MsalAccountLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionIdentity } from "src/utils/getSessionIdentity";

export const getSessionAnswer = <TUser>(
  account: MsalAccountLike | null,
  mapUser: (account: MsalAccountLike) => TUser,
): SessionAnswer<TUser> => {
  if (account === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    ...getSessionIdentity(account),
    user: mapUser(account),
    guest: false,
    impersonated: false,
  };
};
