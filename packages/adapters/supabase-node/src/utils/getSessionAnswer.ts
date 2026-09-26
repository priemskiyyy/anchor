import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { SupabaseUserLike } from "src/types/SupabaseUserLike";
import { SUPABASE_AUTHORITY } from "src/utils/constants/supabase";

export const getSessionAnswer = <TUser>(
  user: SupabaseUserLike,
  mapUser: (user: SupabaseUserLike) => TUser,
): SessionAnswer<TUser> => ({
  status: "signed-in",
  principal: { authority: SUPABASE_AUTHORITY, subject: user.id, tenant: null },
  user: mapUser(user),
  context: null,
  guest: user.is_anonymous === true,
  impersonated: false,
});
