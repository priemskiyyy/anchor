import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { Auth0UserLike } from "src/types/Auth0UserLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  user: Auth0UserLike | null,
  { principal, context }: SessionIdentity,
) =>
  user !== null &&
  user.sub === principal.subject &&
  getSessionContext(user) === context;
