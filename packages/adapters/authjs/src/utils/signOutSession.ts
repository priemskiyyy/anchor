import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { AuthjsClientLike } from "src/types/AuthjsClientLike";
import {
  ENDED_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { getCurrentSession } from "src/utils/getCurrentSession";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: AuthjsClientLike,
  basePath: string,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(await getCurrentSession(basePath), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  await sdk.signOut({ redirect: false });

  // next-auth resolves a sign-out the server refused, its CSRF check included, with the page it answered instead, so the session is asked for again.
  if (isSessionUser(await getCurrentSession(basePath), session)) {
    throw new Error(
      "Auth.js kept the session: the server refused to sign it out.",
    );
  }

  return ENDED_RESULT;
};
