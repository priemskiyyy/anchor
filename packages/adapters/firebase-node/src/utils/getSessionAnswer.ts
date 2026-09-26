import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { FirebaseDecodedTokenLike } from "src/types/FirebaseDecodedTokenLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import {
  ANONYMOUS_PROVIDER,
  FIREBASE_ISSUER,
} from "src/utils/constants/firebase";

export const getSessionAnswer = <TUser>(
  token: FirebaseDecodedTokenLike | null,
  mapUser: (token: FirebaseDecodedTokenLike) => TUser,
): SessionAnswer<TUser> => {
  if (token === null) {
    return SIGNED_OUT_ANSWER;
  }

  return {
    status: "signed-in",
    principal: {
      authority: `${FIREBASE_ISSUER}${token.aud}`,
      subject: token.uid,
      tenant: token.firebase.tenant ?? null,
    },
    user: mapUser(token),
    context: null,
    guest: token.firebase.sign_in_provider === ANONYMOUS_PROVIDER,
    impersonated: false,
  };
};
