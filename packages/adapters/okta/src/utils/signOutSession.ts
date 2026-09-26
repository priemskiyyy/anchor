import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { OktaAuthLike } from "src/types/OktaAuthLike";
import {
  NOT_APPLICABLE_END_RESULT,
  REPLACED_END_RESULT,
  UNKNOWN_REMOTE_END_RESULT,
} from "src/utils/constants/answers";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: OktaAuthLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  const { idToken, accessToken, refreshToken } =
    sdk.tokenManager.getTokensSync();

  if (!isSessionUser(idToken, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  if (refreshToken !== undefined) {
    await sdk.revokeRefreshToken(refreshToken);
  }

  if (accessToken !== undefined) {
    await sdk.revokeAccessToken(accessToken);
  }

  if (!isSessionUser(sdk.tokenManager.getTokensSync().idToken, session)) {
    return REPLACED_END_RESULT;
  }

  sdk.tokenManager.clear();

  const url =
    typeof sdk.getSignOutRedirectUrl === "function"
      ? sdk.getSignOutRedirectUrl({ idToken })
      : "";

  if (url === "") {
    return UNKNOWN_REMOTE_END_RESULT;
  }

  return { local: "completed", remote: "unknown", navigation: { url } };
};
