import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { MsalAccessToken } from "src/types/MsalAccessToken";
import type { MsalLike } from "src/types/MsalLike";
import { getAcquireTokenError } from "src/utils/getAcquireTokenError";
import { isSessionAccount } from "src/utils/isSessionAccount";

const acquireAccessToken = async (
  sdk: MsalLike,
  request: Parameters<MsalLike["acquireTokenSilent"]>[0],
) => {
  try {
    return await sdk.acquireTokenSilent(request);
  } catch (error) {
    throw getAcquireTokenError(error);
  }
};

export const getSessionAccessToken = async (
  sdk: MsalLike,
  tokens: Partial<Record<string, MsalAccessToken>>,
  { profile, forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const definition = tokens[profile];

  if (definition === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The MSAL adapter declares no token profile named "${profile}".`,
    });
  }

  const account = sdk.getActiveAccount();

  if (!isSessionAccount(account, session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "MSAL holds another active account than the session's.",
    });
  }

  const { accessToken, tokenType } = await acquireAccessToken(sdk, {
    scopes: definition.scopes,
    account,
    forceRefresh,
  });

  return { value: accessToken, kind: "access-token", scheme: tokenType };
};
