import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionAnswer } from "@priemskiyyy/anchor";
import type { ServerSessionRequest } from "@priemskiyyy/anchor-server";

import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkUserLike } from "src/types/ClerkUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { PENDING_AS_SIGNED_IN } from "src/utils/constants/clerk";
import { appendHeaders } from "src/utils/appendHeaders";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { isSignedOutReason } from "src/utils/isSignedOutReason";

export const getServerSessionAnswer = async <TUser>(
  sdk: ClerkLike,
  {
    url,
    method,
    headers,
    responseHeaders,
  }: Pick<
    ServerSessionRequest,
    "url" | "method" | "headers" | "responseHeaders"
  >,
  options: { authorizedParties?: string[] },
  mapUser: (user: ClerkUserLike) => TUser,
): Promise<SessionAnswer<TUser>> => {
  const state = await sdk.authenticateRequest(
    new Request(url, { method, headers }),
    options,
  );

  appendHeaders(responseHeaders, state.headers);

  if (state.status === "handshake") {
    throw new AnchorError({
      code: "INTERACTION_REQUIRED",
      message:
        "Clerk must refresh the session through its handshake before it can tell who is signed in: redirect with the response headers.",
    });
  }

  if (state.status === "signed-out" && !isSignedOutReason(state.reason)) {
    throw new Error(
      `Clerk could not tell the request's session: ${state.reason}.`,
      { cause: state },
    );
  }

  if (state.status === "signed-out") {
    return SIGNED_OUT_ANSWER;
  }

  const auth = state.toAuth(PENDING_AS_SIGNED_IN);
  const user = mapUser(await sdk.users.getUser(auth.userId));

  return getSessionAnswer(auth, user);
};
