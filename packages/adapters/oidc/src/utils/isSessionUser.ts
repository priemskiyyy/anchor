import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { OidcUserLike } from "src/types/OidcUserLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  user: OidcUserLike | null,
  { principal, context }: SessionIdentity,
): user is OidcUserLike =>
  user !== null &&
  user.profile.iss === principal.authority &&
  user.profile.sub === principal.subject &&
  getSessionContext(user.profile) === context;
