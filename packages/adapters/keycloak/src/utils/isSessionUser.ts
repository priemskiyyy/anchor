import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { KeycloakTokenParsedLike } from "src/types/KeycloakTokenParsedLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  claims: KeycloakTokenParsedLike | undefined,
  { principal, context }: SessionIdentity,
) =>
  claims !== undefined &&
  claims.iss === principal.authority &&
  claims.sub === principal.subject &&
  getSessionContext(claims) === context;
