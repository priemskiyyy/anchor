import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_REQUIRED_ERROR_NAME } from "src/utils/constants/msal";

export const getAcquireTokenError = (error: unknown) => {
  if (
    error instanceof Error &&
    error.name === INTERACTION_REQUIRED_ERROR_NAME
  ) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: "MSAL needs the user before it mints this token.",
      cause: error,
    });
  }

  return error;
};
