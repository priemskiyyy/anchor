import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_ERRORS } from "src/utils/constants/auth0";

export const getAccessTokenError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string" &&
    Object.hasOwn(INTERACTION_ERRORS, error.error)
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: `Auth0 needs the user before it mints this token: ${error.error}.`,
      cause: error,
    });
  }

  return error;
};
