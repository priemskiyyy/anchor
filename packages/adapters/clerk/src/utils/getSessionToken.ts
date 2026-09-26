import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionToken } from "src/types/ClerkSessionToken";
import { SESSION_TOKEN_SCHEME } from "src/utils/constants/clerk";
import { getLoadedSession } from "src/utils/getLoadedSession";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message: "Clerk holds another session than the one asked for.",
  });

export const getSessionToken = async (
  sdk: ClerkLike,
  tokens: Partial<Record<string, ClerkSessionToken>>,
  { profile, forceRefresh, session: identity, signal }: TokenRequest<string>,
): Promise<Token> => {
  const definition = tokens[profile];

  if (definition === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The Clerk adapter declares no token profile named "${profile}".`,
    });
  }

  const session = await getLoadedSession(sdk, signal);

  if (!isSessionUser(session, identity)) {
    throw createSessionChangedError();
  }

  const value = await session.getToken({
    skipCache: forceRefresh,
    ...(definition.template === undefined
      ? {}
      : { template: definition.template }),
  });

  // clerk-js retries getToken() and reads the active organization again on each try, so a switch while it runs changes what it mints.
  if (!isSessionUser(sdk.session, identity)) {
    throw createSessionChangedError();
  }

  if (value === null) {
    throw new AnchorError({
      code: "TOKEN_FAILED",
      message: "Clerk answered no session token.",
    });
  }

  return { value, kind: "session-token", scheme: SESSION_TOKEN_SCHEME };
};
