import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { ClerkSessionLike } from "src/types/ClerkSessionLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  session: ClerkSessionLike | null | undefined,
  { principal, context }: SessionIdentity,
): session is ClerkSessionLike =>
  session !== null &&
  session !== undefined &&
  session.user.id === principal.subject &&
  getSessionContext(session) === context;
