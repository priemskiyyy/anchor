import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { AmplifyAccessToken } from "src/types/AmplifyAccessToken";
import type { AmplifyIdToken } from "src/types/AmplifyIdToken";
import type { AmplifyLike } from "src/types/AmplifyLike";
import { ACCESS_TOKEN_SCHEME } from "src/utils/constants/amplify";
import { getFetchAuthSessionError } from "src/utils/getFetchAuthSessionError";
import { getSessionTokens } from "src/utils/getSessionTokens";

export const getSessionToken = async (
  sdk: AmplifyLike,
  tokens: Partial<Record<string, AmplifyAccessToken | AmplifyIdToken>>,
  { profile, forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const definition = tokens[profile];

  if (definition === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The Amplify adapter declares no token profile named "${profile}".`,
    });
  }

  const held = await getSessionTokens(sdk, session, forceRefresh).catch(
    (error: unknown) => {
      throw getFetchAuthSessionError(error);
    },
  );

  if (held === null) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "Amplify holds another session than the one asked for.",
    });
  }

  const minted = {
    "access-token": {
      value: held.accessToken.toString(),
      kind: "access-token",
      scheme: ACCESS_TOKEN_SCHEME,
    },
    "id-token": {
      value: held.idToken.toString(),
      kind: "id-token",
      scheme: null,
    },
  } satisfies Record<(AmplifyAccessToken | AmplifyIdToken)["kind"], Token>;

  return minted[definition.kind];
};
