import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_ERRORS } from "src/utils/constants/oidc";

export const getSigninSilentError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string" &&
    Object.hasOwn(INTERACTION_ERRORS, error.error)
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: `The provider needs the user before it renews the token: ${error.error}.`,
      cause: error,
    });
  }

  return error;
};
