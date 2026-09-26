import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import { ID_TOKEN_SCHEME } from "src/utils/constants/firebase";
import { getIdTokenError } from "src/utils/getIdTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

export const getSessionIdToken = async (
  sdk: FirebaseAuthLike,
  { session, forceRefresh }: TokenRequest<string>,
): Promise<Token> => {
  const user = sdk.currentUser;

  if (user === null || !isSessionUser(user, session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "Firebase holds another user than the session asked for.",
    });
  }

  try {
    return {
      value: await user.getIdToken(forceRefresh),
      kind: "id-token",
      scheme: ID_TOKEN_SCHEME,
    };
  } catch (error) {
    throw getIdTokenError(error);
  }
};
