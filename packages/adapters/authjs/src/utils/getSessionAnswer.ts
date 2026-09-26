import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { AUTHJS_AUTHORITY } from "src/utils/constants/authjs";

export const getSessionAnswer = <TUser>(
  session: AuthjsSessionLike | null,
  mapUser: (session: AuthjsSessionLike) => TUser,
): SessionAnswer<TUser> => {
  if (session === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    // A session without the id a session callback adds answers it empty, which the core refuses as INVALID_ANSWER instead of guessing one.
    principal: {
      authority: AUTHJS_AUTHORITY,
      subject: session.user?.id ?? "",
      tenant: null,
    },
    user: mapUser(session),
    context: null,
    guest: false,
    impersonated: false,
  };
};
