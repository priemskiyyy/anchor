import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { OidcUserLike } from "src/types/OidcUserLike";
import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";
import { getSigninSilentError } from "src/utils/getSigninSilentError";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message: "The UserManager holds another user than the session asked for.",
  });

const getUserAccessToken = ({
  access_token,
  token_type,
}: OidcUserLike): Token => ({
  value: access_token,
  kind: "access-token",
  scheme: token_type,
});

const renewUser = async (sdk: OidcUserManagerLike) => {
  try {
    return await sdk.signinSilent();
  } catch (error) {
    throw getSigninSilentError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: OidcUserManagerLike,
  { forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const user = await sdk.getUser();

  if (!isSessionUser(user, session)) {
    throw createSessionChangedError();
  }

  if (!forceRefresh && user.expired !== true) {
    return getUserAccessToken(user);
  }

  const renewed = await renewUser(sdk);

  if (!isSessionUser(renewed, session)) {
    throw createSessionChangedError();
  }

  return getUserAccessToken(renewed);
};
