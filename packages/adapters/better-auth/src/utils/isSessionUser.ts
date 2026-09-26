import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  data: BetterAuthSessionLike | null,
  { principal, context }: SessionIdentity,
) =>
  data !== null &&
  data.user.id === principal.subject &&
  getSessionContext(data) === context;
