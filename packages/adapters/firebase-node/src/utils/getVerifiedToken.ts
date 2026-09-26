import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseCredential } from "src/types/internal/FirebaseCredential";
import { isSignedOutError } from "src/utils/isSignedOutError";

export const getVerifiedToken = async (
  sdk: FirebaseAuthLike,
  { kind, value }: FirebaseCredential,
  checkRevoked: boolean,
) => {
  try {
    return await (kind === "id-token"
      ? sdk.verifyIdToken(value, checkRevoked)
      : sdk.verifySessionCookie(value, checkRevoked));
  } catch (error) {
    if (!isSignedOutError(error, kind)) {
      throw error;
    }

    return null;
  }
};
