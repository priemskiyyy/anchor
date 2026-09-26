import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { SupabaseClientLike } from "src/types/SupabaseClientLike";
import {
  ENDED_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { LOCAL_SCOPE } from "src/utils/constants/supabase";
import { isSessionUser } from "src/utils/isSessionUser";
import { getCurrentSession } from "src/utils/getCurrentSession";

export const signOutSession = async (
  sdk: SupabaseClientLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(await getCurrentSession(sdk), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  const { error } = await sdk.auth.signOut(LOCAL_SCOPE);

  if (error !== null) {
    throw error;
  }

  return ENDED_RESULT;
};
