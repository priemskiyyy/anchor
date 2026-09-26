import { AnchorError } from "@priemskiyyy/anchor";

import { INTERACTION_ERRORS, NO_CREDENTIALS } from "src/utils/constants/auth0";
import { getCredentialsErrorType } from "src/utils/getCredentialsErrorType";

export const getCredentialsError = (error: unknown) => {
  const type = getCredentialsErrorType(error);

  if (type === NO_CREDENTIALS) {
    return new AnchorError({
      code: "SESSION_CHANGED",
      message: "The credentials manager holds no session any more.",
      cause: error,
    });
  }

  if (type !== null && Object.hasOwn(INTERACTION_ERRORS, type)) {
    return new AnchorError({
      code: "INTERACTION_REQUIRED",
      message: `Auth0 needs the user before it mints this token: ${type}.`,
      cause: error,
    });
  }

  return error;
};
