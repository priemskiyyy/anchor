import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionIdentity, Token, TokenRequest } from "@priemskiyyy/anchor";

import type { OktaAuthLike } from "src/types/OktaAuthLike";
import type { OktaTokensLike } from "src/types/OktaTokensLike";
import { ACCESS_TOKEN_KEY } from "src/utils/constants/okta";
import { getRenewTokenError } from "src/utils/getRenewTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

const getSessionTokens = (sdk: OktaAuthLike, session: SessionIdentity) => {
  const tokens = sdk.tokenManager.getTokensSync();

  if (!isSessionUser(tokens.idToken, session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "okta-auth-js holds another session than the one asked for.",
    });
  }

  return tokens;
};

const getAccessToken = ({
  accessToken,
  tokenType,
}: NonNullable<OktaTokensLike["accessToken"]>): Token => ({
  value: accessToken,
  kind: "access-token",
  scheme: tokenType,
});

const renewAccessToken = async (sdk: OktaAuthLike) => {
  try {
    await sdk.tokenManager.renew(
      sdk.tokenManager.getStorageKeyByType(ACCESS_TOKEN_KEY) ??
        ACCESS_TOKEN_KEY,
    );
  } catch (error) {
    throw getRenewTokenError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: OktaAuthLike,
  { forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const { accessToken } = getSessionTokens(sdk, session);

  if (
    !forceRefresh &&
    accessToken !== undefined &&
    !sdk.tokenManager.hasExpired(accessToken)
  ) {
    return getAccessToken(accessToken);
  }

  await renewAccessToken(sdk);

  const renewed = getSessionTokens(sdk, session).accessToken;

  if (renewed === undefined) {
    throw new AnchorError({
      code: "TOKEN_FAILED",
      message: "okta-auth-js renewed no access token.",
    });
  }

  return getAccessToken(renewed);
};
