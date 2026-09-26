import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { OktaTokensLike } from "src/types/OktaTokensLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  idToken: OktaTokensLike["idToken"],
  { principal, context }: SessionIdentity,
): idToken is NonNullable<OktaTokensLike["idToken"]> =>
  idToken !== undefined &&
  idToken.claims.iss === principal.authority &&
  idToken.claims.sub === principal.subject &&
  getSessionContext(idToken.claims) === context;
