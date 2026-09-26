import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import {
  LOCAL_END_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { getStoredUser } from "src/utils/getStoredUser";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: Auth0Like,
  parseIdToken: Auth0IdTokenParserLike,
  tokens: Partial<Record<string, Auth0AccessToken>>,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(await getStoredUser(sdk, parseIdToken), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  // The API credentials of getApiCredentials are cached apart from the login's, so each audience a profile minted for is cleared on its own.
  for (const profile of Object.values(tokens)) {
    if (profile?.audience === undefined) {
      continue;
    }

    await sdk.credentialsManager.clearApiCredentials(
      profile.audience,
      profile.scope,
    );
  }

  await sdk.credentialsManager.clearCredentials();

  return LOCAL_END_RESULT;
};
