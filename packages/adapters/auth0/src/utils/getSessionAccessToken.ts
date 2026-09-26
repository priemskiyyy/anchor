import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0ClientLike } from "src/types/Auth0ClientLike";
import { getAccessTokenError } from "src/utils/getAccessTokenError";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message: "Auth0 holds another session than the one asked for.",
  });

const getTokenResponse = async (
  sdk: Auth0ClientLike,
  { audience, scope }: Auth0AccessToken,
  forceRefresh: boolean,
) => {
  try {
    return await sdk.getTokenSilently({
      authorizationParams: {
        ...(audience === undefined ? {} : { audience }),
        ...(scope === undefined ? {} : { scope }),
      },
      cacheMode: forceRefresh ? "off" : "on",
      detailedResponse: true,
    });
  } catch (error) {
    throw getAccessTokenError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: Auth0ClientLike,
  tokens: Partial<Record<string, Auth0AccessToken>>,
  { profile, forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const definition = tokens[profile];

  if (definition === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The Auth0 adapter declares no token profile named "${profile}".`,
    });
  }

  if (!isSessionUser(await sdk.getIdTokenClaims(), session)) {
    throw createSessionChangedError();
  }

  const response = await getTokenResponse(sdk, definition, forceRefresh);

  // The silent iframe mints for whoever Auth0's session cookie names now, and caches that user's ID token.
  if (!isSessionUser(await sdk.getIdTokenClaims(), session)) {
    throw createSessionChangedError();
  }

  if (response === undefined) {
    throw new AnchorError({
      code: "TOKEN_FAILED",
      message: "Auth0 answered no access token.",
    });
  }

  return {
    value: response.access_token,
    kind: "access-token",
    scheme: response.token_type,
  };
};
