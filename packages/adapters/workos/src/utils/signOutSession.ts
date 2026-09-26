import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosRefreshes } from "src/types/WorkosRefreshes";
import {
  NOT_APPLICABLE_END_RESULT,
  SIGNED_OUT_HERE_RESULT,
} from "src/utils/constants/answers";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: WorkosClientLike,
  refreshes: WorkosRefreshes,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(sdk.getUser(), refreshes.getLatestRefresh(), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  // With navigate: false AuthKit fetches its logout page in no-cors mode instead of opening it, and cannot read the answer.
  await sdk.signOut({ navigate: false });

  return SIGNED_OUT_HERE_RESULT;
};
