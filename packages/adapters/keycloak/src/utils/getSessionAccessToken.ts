import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionIdentity, Token, TokenRequest } from "@priemskiyyy/anchor";

import type { KeycloakLike } from "src/types/KeycloakLike";
import {
  ACCESS_TOKEN_SCHEME,
  FORCED_REFRESH,
  TOKEN_MIN_VALIDITY,
} from "src/utils/constants/keycloak";
import { getUpdateTokenError } from "src/utils/getUpdateTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

const getHeldAccessToken = (
  sdk: KeycloakLike,
  session: SessionIdentity,
): Token => {
  const { token, tokenParsed } = sdk;

  if (token === undefined || !isSessionUser(tokenParsed, session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "keycloak-js holds another session than the one asked for.",
    });
  }

  return { value: token, kind: "access-token", scheme: ACCESS_TOKEN_SCHEME };
};

const refreshAccessToken = async (sdk: KeycloakLike, forceRefresh: boolean) => {
  try {
    await sdk.updateToken(forceRefresh ? FORCED_REFRESH : TOKEN_MIN_VALIDITY);
  } catch (error) {
    throw getUpdateTokenError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: KeycloakLike,
  { forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const held = getHeldAccessToken(sdk, session);

  if (sdk.refreshToken === undefined && forceRefresh) {
    throw new AnchorError({
      code: "UNSUPPORTED",
      message:
        "keycloak-js holds no refresh token, so it cannot refresh the access token.",
    });
  }

  if (sdk.refreshToken === undefined) {
    return held;
  }

  await refreshAccessToken(sdk, forceRefresh);

  return getHeldAccessToken(sdk, session);
};
