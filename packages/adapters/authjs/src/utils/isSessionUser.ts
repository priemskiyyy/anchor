import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";

export const isSessionUser = (
  session: AuthjsSessionLike | null,
  { principal }: SessionIdentity,
) => session !== null && session.user?.id === principal.subject;
