import { AnchorError } from "@priemskiyyy/anchor";

import { USER_TOKEN_EXPIRED } from "src/utils/constants/firebase";

export const getIdTokenError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === USER_TOKEN_EXPIRED
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: "Firebase needs the user to sign in again.",
      cause: error,
    });
  }

  return error;
};
