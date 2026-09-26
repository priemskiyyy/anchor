import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { WorkosSessionLike } from "src/types/WorkosSessionLike";
import type { WorkosUserLike } from "src/types/WorkosUserLike";
import { WORKOS_AUTHORITY } from "src/utils/constants/workos";

export const getSessionAnswer = <TUser>(
  { user, organizationId, impersonator }: WorkosSessionLike,
  mapUser: (user: WorkosUserLike) => TUser,
): SessionAnswer<TUser> => ({
  status: "signed-in",
  principal: { authority: WORKOS_AUTHORITY, subject: user.id, tenant: null },
  user: mapUser(user),
  context: JSON.stringify([
    organizationId ?? null,
    impersonator?.email ?? null,
  ]),
  guest: false,
  impersonated: impersonator !== undefined,
});
