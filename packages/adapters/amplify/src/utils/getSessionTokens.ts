import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { AmplifyLike } from "src/types/AmplifyLike";
import { isSessionUser } from "src/utils/isSessionUser";

export const getSessionTokens = async (
  sdk: AmplifyLike,
  session: SessionIdentity,
  forceRefresh: boolean,
) => {
  const { tokens } = await sdk.auth.fetchAuthSession({ forceRefresh });

  if (
    tokens?.idToken === undefined ||
    !isSessionUser(tokens.idToken.payload, session)
  ) {
    return null;
  }

  return { accessToken: tokens.accessToken, idToken: tokens.idToken };
};
