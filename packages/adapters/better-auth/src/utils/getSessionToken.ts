import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import { getRefreshedSession } from "src/utils/getRefreshedSession";
import { isSessionUser } from "src/utils/isSessionUser";

export const getSessionToken = async (
  atom: BetterAuthSessionAtomLike,
  { forceRefresh, session, signal }: TokenRequest<string>,
): Promise<Token> => {
  const data = forceRefresh
    ? await getRefreshedSession(atom, signal)
    : atom.get().data;

  if (data === null || !isSessionUser(data, session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "Better Auth holds another session than the one asked for.",
    });
  }

  if (typeof data.session.token !== "string") {
    throw new AnchorError({
      code: "UNSUPPORTED",
      message:
        "The Better Auth server does not send the session's token to the client.",
    });
  }

  return { value: data.session.token, kind: "session-token", scheme: "Bearer" };
};
