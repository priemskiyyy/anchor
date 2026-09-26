import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionIdentity, Token } from "@priemskiyyy/anchor";

import type { HttpToken } from "src/types/HttpToken";
import { DEFAULT_TOKEN_KIND } from "src/utils/constants/http";

// A cookie authenticates whoever is signed in now, so only what the server says it minted for proves the token is the session's.
export const getSessionToken = (
  { value, subject, tenant, context, kind, scheme }: HttpToken,
  { principal, context: sessionContext }: SessionIdentity,
): Token => {
  if (subject !== principal.subject) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message:
        "The server minted the token for another user than the session's.",
    });
  }

  if (
    (tenant !== undefined && tenant !== principal.tenant) ||
    (context !== undefined && context !== sessionContext)
  ) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message:
        "The server minted the token in another tenant or context than the session's.",
    });
  }

  return { value, kind: kind ?? DEFAULT_TOKEN_KIND, scheme: scheme ?? null };
};
