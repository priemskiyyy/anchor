import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosRefreshes } from "src/types/WorkosRefreshes";
import { ACCESS_TOKEN_SCHEME } from "src/utils/constants/workos";
import { getAccessTokenError } from "src/utils/getAccessTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message: "AuthKit holds another session than the one asked for.",
  });

const requestAccessToken = async (
  sdk: WorkosClientLike,
  forceRefresh: boolean,
) => {
  try {
    return await sdk.getAccessToken({ forceRefresh });
  } catch (error) {
    throw getAccessTokenError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: WorkosClientLike,
  refreshes: WorkosRefreshes,
  { forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  if (!isSessionUser(sdk.getUser(), refreshes.getLatestRefresh(), session)) {
    throw createSessionChangedError();
  }

  const value = await requestAccessToken(sdk, forceRefresh);

  // A refresh while the token is minted may switch the organization, as switchToOrganization() does.
  if (!isSessionUser(sdk.getUser(), refreshes.getLatestRefresh(), session)) {
    throw createSessionChangedError();
  }

  return { value, kind: "access-token", scheme: ACCESS_TOKEN_SCHEME };
};
