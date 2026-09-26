import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { WorkosRefreshedSession } from "src/types/WorkosRefreshedSession";
import type { WorkosUserLike } from "src/types/WorkosUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { WORKOS_AUTHORITY } from "src/utils/constants/workos";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  user: WorkosUserLike | null,
  refreshed: WorkosRefreshedSession | null,
  mapUser: (user: WorkosUserLike) => TUser,
): SessionAnswer<TUser> => {
  if (user === null) {
    return SIGNED_OUT_ANSWER;
  }

  // AuthKit calls onRefresh whenever it stores a session, so a user with no refresh heard means the callbacks were not wired.
  if (refreshed === null) {
    throw new TypeError(
      "AuthKit holds a user whose refresh the adapter never heard: pass refreshes.handleRefresh to createClient() as onRefresh.",
    );
  }

  return {
    status: "signed-in",
    principal: { authority: WORKOS_AUTHORITY, subject: user.id, tenant: null },
    user: mapUser(user),
    context: getSessionContext(refreshed),
    guest: false,
    impersonated: refreshed.impersonator !== null,
  };
};
