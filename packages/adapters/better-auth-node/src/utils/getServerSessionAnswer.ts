import type { SessionAnswer } from "@priemskiyyy/anchor";
import type { ServerSessionRequest } from "@priemskiyyy/anchor-server";

import type { BetterAuthServerLike } from "src/types/BetterAuthServerLike";
import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { appendHeaders } from "src/utils/appendHeaders";
import { getApiErrorHeaders } from "src/utils/getApiErrorHeaders";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { isUnauthorizedApiError } from "src/utils/isUnauthorizedApiError";

export const getServerSessionAnswer = async <TUser>(
  sdk: BetterAuthServerLike,
  {
    headers,
    responseHeaders,
  }: Pick<ServerSessionRequest, "headers" | "responseHeaders">,
  mapUser: (user: BetterAuthSessionLike["user"]) => TUser,
): Promise<SessionAnswer<TUser>> => {
  try {
    const answer = await sdk.api.getSession({ headers, returnHeaders: true });

    appendHeaders(responseHeaders, answer.headers);

    return getSessionAnswer(answer.response, mapUser);
  } catch (error) {
    appendHeaders(responseHeaders, getApiErrorHeaders(error));

    // Better Auth throws a 401 after deleting a session it could not refresh, which is no session.
    if (!isUnauthorizedApiError(error)) {
      throw error;
    }

    return SIGNED_OUT_ANSWER;
  }
};
