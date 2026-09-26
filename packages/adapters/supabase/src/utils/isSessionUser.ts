import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { SupabaseSessionLike } from "src/types/SupabaseSessionLike";

export const isSessionUser = (
  session: SupabaseSessionLike | null,
  { principal }: SessionIdentity,
): session is SupabaseSessionLike =>
  session !== null && session.user.id === principal.subject;
