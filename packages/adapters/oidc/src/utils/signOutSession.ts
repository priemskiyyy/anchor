import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";
import {
  NO_END_SESSION_END_RESULT,
  NOT_APPLICABLE_END_RESULT,
  UNKNOWN_REMOTE_END_RESULT,
} from "src/utils/constants/answers";
import { getEndSessionUrl } from "src/utils/getEndSessionUrl";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: OidcUserManagerLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  const user = await sdk.getUser();

  if (!isSessionUser(user, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  await sdk.removeUser();

  let endpoint: string | undefined;

  try {
    endpoint = await sdk.metadataService.getEndSessionEndpoint();
  } catch {
    return UNKNOWN_REMOTE_END_RESULT;
  }

  if (endpoint === undefined) {
    return NO_END_SESSION_END_RESULT;
  }

  return {
    local: "completed",
    remote: "unknown",
    navigation: {
      url: getEndSessionUrl(endpoint, user.id_token, sdk.settings),
    },
  };
};
