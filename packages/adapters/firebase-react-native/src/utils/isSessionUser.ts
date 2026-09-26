import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

export const isSessionUser = (
  user: FirebaseUserLike | null,
  { principal }: SessionIdentity,
): user is FirebaseUserLike =>
  user !== null &&
  user.uid === principal.subject &&
  user.tenantId === principal.tenant;
