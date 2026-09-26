import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import {
  LOCAL_END_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { NO_CURRENT_USER } from "src/utils/constants/firebase";
import { getFirebaseErrorCode } from "src/utils/getFirebaseErrorCode";
import { getNativeSubject } from "src/utils/getNativeSubject";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: FirebaseAuthLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  const user = sdk.currentUser;

  if (!isSessionUser(user, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  // signOut() signs out whichever user the native SDK holds, which may already be another than JavaScript's mirror.
  if ((await getNativeSubject(user)) !== session.principal.subject) {
    return NOT_APPLICABLE_END_RESULT;
  }

  try {
    await sdk.signOut();
  } catch (error) {
    // The native SDK refuses to sign out when it already holds no user, before JavaScript heard of it.
    if (getFirebaseErrorCode(error) !== NO_CURRENT_USER) {
      throw error;
    }

    return NOT_APPLICABLE_END_RESULT;
  }

  return LOCAL_END_RESULT;
};
