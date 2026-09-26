import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { MsalAccountLike } from "src/types/MsalAccountLike";

export const getSessionIdentity = ({
  environment,
  homeAccountId,
  tenantId,
  idTokenClaims,
}: MsalAccountLike): SessionIdentity => ({
  principal: {
    authority: environment,
    subject: homeAccountId,
    tenant: tenantId === "" ? null : tenantId,
  },
  context: idTokenClaims?.sid ?? null,
});
