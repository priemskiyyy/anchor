import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import {
  LOCAL_END_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: FirebaseAuthLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(sdk.currentUser, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  await sdk.signOut();

  return LOCAL_END_RESULT;
};
