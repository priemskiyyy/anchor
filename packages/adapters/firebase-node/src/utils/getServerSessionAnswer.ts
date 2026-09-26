import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseDecodedTokenLike } from "src/types/FirebaseDecodedTokenLike";
import { getRequestCredential } from "src/utils/getRequestCredential";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getVerifiedToken } from "src/utils/getVerifiedToken";

export const getServerSessionAnswer = async <TUser>(
  sdk: FirebaseAuthLike,
  headers: Headers,
  { cookie, checkRevoked }: { cookie: string; checkRevoked: boolean },
  mapUser: (token: FirebaseDecodedTokenLike) => TUser,
): Promise<SessionAnswer<TUser>> => {
  const credential = getRequestCredential(headers, cookie);

  const token =
    credential === null
      ? null
      : await getVerifiedToken(sdk, credential, checkRevoked);

  return getSessionAnswer(token, mapUser);
};
