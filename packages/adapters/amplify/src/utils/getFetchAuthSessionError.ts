import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_ERRORS } from "src/utils/constants/amplify";

export const getFetchAuthSessionError = (error: unknown) => {
  if (error instanceof Error && Object.hasOwn(INTERACTION_ERRORS, error.name)) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: `Cognito needs the user to sign in again: ${error.name}.`,
      cause: error,
    });
  }

  return error;
};
