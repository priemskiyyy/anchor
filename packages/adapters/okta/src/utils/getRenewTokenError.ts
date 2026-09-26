import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_ERRORS } from "src/utils/constants/okta";

export const getRenewTokenError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    typeof error.errorCode === "string" &&
    Object.hasOwn(INTERACTION_ERRORS, error.errorCode)
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: `Okta needs the user before it renews the token: ${error.errorCode}.`,
      cause: error,
    });
  }

  return error;
};
