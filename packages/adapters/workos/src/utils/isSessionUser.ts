import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { WorkosRefreshedSession } from "src/types/WorkosRefreshedSession";
import type { WorkosUserLike } from "src/types/WorkosUserLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  user: WorkosUserLike | null,
  refreshed: WorkosRefreshedSession | null,
  { principal, context }: SessionIdentity,
) =>
  user !== null &&
  refreshed !== null &&
  user.id === principal.subject &&
  getSessionContext(refreshed) === context;
