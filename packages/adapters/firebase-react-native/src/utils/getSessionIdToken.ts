import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseUserLike } from "src/types/FirebaseUserLike";
import { ID_TOKEN_SCHEME } from "src/utils/constants/firebase";
import { getIdTokenError } from "src/utils/getIdTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message: "Firebase holds another user than the session asked for.",
  });

const requestIdTokenResult = async (
  user: FirebaseUserLike,
  forceRefresh: boolean,
) => {
  try {
    return await user.getIdTokenResult(forceRefresh);
  } catch (error) {
    throw getIdTokenError(error);
  }
};

export const getSessionIdToken = async (
  sdk: FirebaseAuthLike,
  { session, forceRefresh }: TokenRequest<string>,
): Promise<Token> => {
  const user = sdk.currentUser;

  if (!isSessionUser(user, session)) {
    throw createSessionChangedError();
  }

  const { token, claims } = await requestIdTokenResult(user, forceRefresh);

  // React Native Firebase mints for whichever user the native SDK holds by then, so only the claims it decoded name the token's user.
  if (claims.sub !== session.principal.subject) {
    throw createSessionChangedError();
  }

  return { value: token, kind: "id-token", scheme: ID_TOKEN_SCHEME };
};
