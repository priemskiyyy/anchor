import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { ClerkSessionLike } from "src/types/ClerkSessionLike";
import type { ClerkUserLike } from "src/types/ClerkUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  frontendApi: string,
  session: ClerkSessionLike | null,
  mapUser: (user: ClerkUserLike) => TUser,
): SessionAnswer<TUser> => {
  if (session === null) {
    return SIGNED_OUT_ANSWER;
  }

  const answer = {
    principal: {
      authority: `https://${frontendApi}`,
      subject: session.user.id,
      tenant: null,
    },
    user: mapUser(session.user),
    context: getSessionContext(session),
    guest: false,
    impersonated: session.actor !== null,
  };

  if (session.status === "pending") {
    return {
      status: "action-required",
      action: { kind: session.currentTask.key },
      ...answer,
    };
  }

  return { status: "signed-in", ...answer };
};
