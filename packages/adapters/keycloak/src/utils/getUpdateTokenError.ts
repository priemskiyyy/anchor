import { AnchorError } from "@priemskiyyy/anchor";

import { REFRESH_REFUSED_STATUS } from "src/utils/constants/keycloak";

export const getUpdateTokenError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    error.response.status === REFRESH_REFUSED_STATUS
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message:
        "Keycloak refused the refresh token, so the user must sign in again.",
      cause: error,
    });
  }

  return error;
};
