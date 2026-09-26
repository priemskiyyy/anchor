import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { HttpTokenMinter } from "src/types/HttpTokenMinter";
import { getSessionToken } from "src/utils/getSessionToken";

export const mintSessionToken = async (
  tokens: Partial<Record<string, HttpTokenMinter>>,
  request: TokenRequest<string>,
): Promise<Token> => {
  const mint = tokens[request.profile];

  // The core refuses an undeclared profile before it asks the adapter.
  if (mint === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The http adapter declares no token profile named ${request.profile}.`,
    });
  }

  return getSessionToken(await mint(request), request.session);
};
