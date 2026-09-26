import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { HttpSessionAnswer } from "src/types/HttpSessionAnswer";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";

export const getSessionAnswer = <TUser>(
  answer: HttpSessionAnswer<TUser> | null,
  authority: string,
): SessionAnswer<TUser> => {
  if (answer === null) {
    return SIGNED_OUT_ANSWER;
  }

  const session = {
    principal: {
      authority,
      subject: answer.subject,
      tenant: answer.tenant ?? null,
    },
    user: answer.user,
    context: answer.context ?? null,
    guest: answer.guest ?? false,
    impersonated: answer.impersonated ?? false,
  };

  if (answer.action === undefined || answer.action === null) {
    return { status: "signed-in", ...session };
  }

  return { status: "action-required", action: answer.action, ...session };
};
