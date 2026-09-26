import { AnchorError } from "@priemskiyyy/anchor";

import {
  NO_CURRENT_USER,
  USER_TOKEN_EXPIRED,
} from "src/utils/constants/firebase";
import { getFirebaseErrorCode } from "src/utils/getFirebaseErrorCode";

export const getIdTokenError = (error: unknown) => {
  const code = getFirebaseErrorCode(error);

  if (code === USER_TOKEN_EXPIRED) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: "Firebase needs the user to sign in again.",
      cause: error,
    });
  }

  if (code === NO_CURRENT_USER) {
    return new AnchorError({
      code: "SESSION_CHANGED",
      message: "The native Firebase SDK holds no user any more.",
      cause: error,
    });
  }

  return error;
};
