import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  claims: Auth0ClaimsLike | undefined,
  { principal, context }: SessionIdentity,
) =>
  claims !== undefined &&
  claims.sub === principal.subject &&
  getSessionContext(claims) === context;
