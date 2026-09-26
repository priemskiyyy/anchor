import type { FirebaseUserLike } from "src/types/FirebaseUserLike";
import { NO_CURRENT_USER } from "src/utils/constants/firebase";
import { getFirebaseErrorCode } from "src/utils/getFirebaseErrorCode";

export const getNativeSubject = async (user: FirebaseUserLike) => {
  try {
    return (await user.getIdTokenResult(false)).claims.sub;
  } catch (error) {
    if (getFirebaseErrorCode(error) === NO_CURRENT_USER) {
      return null;
    }

    // A token that cannot be read, such as an expired one offline, leaves JavaScript's mirror as the best evidence, so an offline sign-out still works.
    return user.uid;
  }
};
