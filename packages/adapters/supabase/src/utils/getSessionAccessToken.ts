import { AnchorError } from "@priemskiyyy/anchor";
import type { Token, TokenRequest } from "@priemskiyyy/anchor";

import type { SupabaseClientLike } from "src/types/SupabaseClientLike";
import type { SupabaseSessionLike } from "src/types/SupabaseSessionLike";
import { isSessionUser } from "src/utils/isSessionUser";
import { getCurrentSession } from "src/utils/getCurrentSession";

const getRefreshedSession = async (sdk: SupabaseClientLike) => {
  const { data, error } = await sdk.auth.refreshSession();

  if (error !== null) {
    throw error;
  }

  return data.session;
};

const getTokenFromSession = (
  session: SupabaseSessionLike | null,
  request: TokenRequest<string>,
): Token => {
  if (!isSessionUser(session, request.session)) {
    throw new AnchorError({
      code: "SESSION_CHANGED",
      message: "Supabase holds another session than the one asked for.",
    });
  }

  return {
    value: session.access_token,
    kind: "access-token",
    scheme: session.token_type,
  };
};

export const getSessionAccessToken = async (
  sdk: SupabaseClientLike,
  request: TokenRequest<string>,
): Promise<Token> => {
  const current = getTokenFromSession(await getCurrentSession(sdk), request);

  if (!request.forceRefresh) {
    return current;
  }

  return getTokenFromSession(await getRefreshedSession(sdk), request);
};
