import { AnchorError } from "@priemskiyyy/anchor";

import { isLoginRequiredError } from "src/utils/isLoginRequiredError";

export const getAccessTokenError = (error: unknown) => {
  if (!isLoginRequiredError(error)) {
    return error;
  }

  return new AnchorError({
    code: "INTERACTION_REQUIRED",
    message: "AuthKit needs the user to sign in again before it mints a token.",
    cause: error,
  });
};
