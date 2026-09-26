import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { KeycloakLike } from "src/types/KeycloakLike";
import {
  NOT_APPLICABLE_END_RESULT,
  UNKNOWN_REMOTE_END_RESULT,
} from "src/utils/constants/answers";
import { isSessionUser } from "src/utils/isSessionUser";

const getLogoutUrl = (sdk: KeycloakLike) => {
  // keycloak-js throws here for an OpenID Connect provider that publishes no end-session endpoint.
  try {
    return sdk.createLogoutUrl({ logoutMethod: "GET" });
  } catch {
    return null;
  }
};

export const signOutSession = (
  sdk: KeycloakLike,
  { session }: EndRequest,
): EndResult => {
  if (!isSessionUser(sdk.tokenParsed, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  const url = getLogoutUrl(sdk);

  sdk.clearToken();

  if (url === null) {
    return UNKNOWN_REMOTE_END_RESULT;
  }

  return { local: "completed", remote: "unknown", navigation: { url } };
};
