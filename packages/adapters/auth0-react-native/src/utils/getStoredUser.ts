import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import { getStoredCredentials } from "src/utils/getStoredCredentials";

export const getStoredUser = async (
  sdk: Auth0Like,
  parseIdToken: Auth0IdTokenParserLike,
) => {
  const credentials = await getStoredCredentials(sdk);

  if (credentials === null) {
    return null;
  }

  return parseIdToken(credentials.idToken);
};
