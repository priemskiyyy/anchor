import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import {
  ENDED_RESULT,
  LOCALLY_ENDED_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { getRefreshedOrHeldSession } from "src/utils/getRefreshedOrHeldSession";
import { getSignOutOutcome } from "src/utils/getSignOutOutcome";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: BetterAuthClientLike,
  atom: BetterAuthSessionAtomLike,
  { session, signal }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(await getRefreshedOrHeldSession(atom, signal), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  const outcome = await getSignOutOutcome(sdk);

  if (!outcome.failed) {
    return ENDED_RESULT;
  }

  // Better Auth's Expo plugin clears the stored session before it asks the server, so a sign-out that fails offline still ended it here.
  if (atom.get().data === null) {
    return LOCALLY_ENDED_RESULT;
  }

  throw outcome.error;
};
