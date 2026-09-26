import type { MsalAccountLike } from "src/types/MsalAccountLike";
import type { MsalSessionUser } from "src/types/MsalSessionUser";

export const getMsalSessionUser = ({
  homeAccountId,
  environment,
  tenantId,
  username,
  localAccountId,
  name,
}: MsalAccountLike): MsalSessionUser => ({
  homeAccountId,
  environment,
  tenantId,
  username,
  localAccountId,
  name: name ?? null,
});
