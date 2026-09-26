import type { SessionAnswer } from "@priemskiyyy/anchor";
import type { ServerSessionRequest } from "@priemskiyyy/anchor-server";

import type { SupabaseCookieMethods } from "src/types/SupabaseCookieMethods";
import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";
import type { SupabaseUserLike } from "src/types/SupabaseUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getRequestCookies } from "src/utils/getRequestCookies";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSetCookieHeader } from "src/utils/getSetCookieHeader";
import { isSignedOutError } from "src/utils/isSignedOutError";

export const getServerSessionAnswer = async <TUser>(
  sdk: (cookies: SupabaseCookieMethods) => SupabaseServerClientLike,
  {
    headers,
    responseHeaders,
  }: Pick<ServerSessionRequest, "headers" | "responseHeaders">,
  mapUser: (user: SupabaseUserLike) => TUser,
): Promise<SessionAnswer<TUser>> => {
  const client = sdk({
    getAll: () => getRequestCookies(headers),
    setAll: (cookies, cacheHeaders) => {
      for (const { name, value, options } of cookies) {
        responseHeaders.append(
          "set-cookie",
          getSetCookieHeader(name, value, options),
        );
      }

      for (const [name, value] of Object.entries(cacheHeaders)) {
        responseHeaders.set(name, value);
      }
    },
  });

  const result = await client.auth.getUser();

  if (result.error === null) {
    return getSessionAnswer(result.data.user, mapUser);
  }

  if (!isSignedOutError(result.error)) {
    throw result.error;
  }

  return SIGNED_OUT_ANSWER;
};
