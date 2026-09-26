import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { ClerkAuthLike } from "src/types/ClerkAuthLike";
import { PENDING_SESSION_STATUS } from "src/utils/constants/clerk";

export const getSessionAnswer = <TUser>(
  auth: ClerkAuthLike,
  user: TUser,
): SessionAnswer<TUser> => {
  const answer = {
    principal: {
      authority: auth.sessionClaims.iss,
      subject: auth.userId,
      tenant: null,
    },
    user,
    context: JSON.stringify([
      auth.orgId ?? null,
      auth.sessionId,
      auth.actor?.sub ?? null,
    ]),
    guest: false,
    impersonated: auth.actor !== undefined,
  };

  // The session token says a session is pending but not which task, which the client adapter answers as the task's key.
  if (auth.sessionStatus === PENDING_SESSION_STATUS) {
    return {
      status: "action-required",
      action: { kind: PENDING_SESSION_STATUS },
      ...answer,
    };
  }

  return { status: "signed-in", ...answer };
};
