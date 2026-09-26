import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { MsalAccountLike } from "src/types/MsalAccountLike";
import { getSessionIdentity } from "src/utils/getSessionIdentity";

export const isSessionAccount = (
  account: MsalAccountLike | null,
  { principal, context }: SessionIdentity,
): account is MsalAccountLike => {
  if (account === null) {
    return false;
  }

  const identity = getSessionIdentity(account);

  return (
    identity.principal.authority === principal.authority &&
    identity.principal.subject === principal.subject &&
    identity.principal.tenant === principal.tenant &&
    identity.context === context
  );
};
