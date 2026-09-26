import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { SupabaseSessionLike } from "src/types/SupabaseSessionLike";
import type { SupabaseUserLike } from "src/types/SupabaseUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { SUPABASE_AUTHORITY } from "src/utils/constants/supabase";

export const getSessionAnswer = <TUser>(
  session: SupabaseSessionLike | null,
  mapUser: (user: SupabaseUserLike) => TUser,
): SessionAnswer<TUser> => {
  if (session === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    principal: {
      authority: SUPABASE_AUTHORITY,
      subject: session.user.id,
      tenant: null,
    },
    user: mapUser(session.user),
    context: null,
    guest: session.user.is_anonymous === true,
    impersonated: false,
  };
};
