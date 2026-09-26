import type { SessionAnswer } from "@priemskiyyy/anchor";
import type { ServerSessionRequest } from "@priemskiyyy/anchor-server";

import type { WorkosLike } from "src/types/WorkosLike";
import type { WorkosUserLike } from "src/types/WorkosUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { EXPIRED_ACCESS_TOKEN_REASON } from "src/utils/constants/workos";
import { getRequestCookie } from "src/utils/getRequestCookie";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionCookieHeader } from "src/utils/getSessionCookieHeader";

export const getServerSessionAnswer = async <TUser>(
  sdk: WorkosLike,
  {
    headers,
    responseHeaders,
  }: Pick<ServerSessionRequest, "headers" | "responseHeaders">,
  { cookie, cookiePassword }: { cookie: string; cookiePassword: string },
  mapUser: (user: WorkosUserLike) => TUser,
): Promise<SessionAnswer<TUser>> => {
  const sessionData = getRequestCookie(headers, cookie);

  if (sessionData === null) {
    return SIGNED_OUT_ANSWER;
  }

  const sealedSession = sdk.userManagement.loadSealedSession({
    sessionData,
    cookiePassword,
  });

  const authentication = await sealedSession.authenticate();

  if (authentication.authenticated) {
    return getSessionAnswer(authentication, mapUser);
  }

  if (authentication.reason !== EXPIRED_ACCESS_TOKEN_REASON) {
    return SIGNED_OUT_ANSWER;
  }

  const refresh = await sealedSession.refresh();

  if (!refresh.authenticated && refresh.retryable) {
    throw (
      refresh.error ??
      new Error(`WorkOS could not refresh the session: ${refresh.reason}.`)
    );
  }

  if (!refresh.authenticated) {
    responseHeaders.append("set-cookie", getSessionCookieHeader(cookie, null));

    return SIGNED_OUT_ANSWER;
  }

  // loadSealedSession().refresh() seals the new session; without one the browser keeps the cookie it sent.
  if (refresh.sealedSession !== undefined) {
    responseHeaders.append(
      "set-cookie",
      getSessionCookieHeader(cookie, refresh.sealedSession),
    );
  }

  return getSessionAnswer(refresh, mapUser);
};
