import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { ClerkLike } from "src/types/ClerkLike";
import {
  ENDED_RESULT,
  NOT_APPLICABLE_END_RESULT,
  UNKNOWN_REMOTE_END_RESULT,
} from "src/utils/constants/answers";
import { getLoadedSession } from "src/utils/getLoadedSession";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: ClerkLike,
  { session: identity, signal }: EndRequest,
): Promise<EndResult> => {
  const session = await getLoadedSession(sdk, signal);

  // With one signed-in session, signOut({ sessionId }) removes every session whatever id it names, so only the active one is ever named.
  if (!isSessionUser(session, identity)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  // Without a callback, signOut() navigates to the after-sign-out page by itself.
  await sdk.signOut(() => {}, { sessionId: session.id });

  const isStillHeld =
    sdk.client?.signedInSessions.some(({ id }) => id === session.id) ?? false;

  if (isStillHeld) {
    return UNKNOWN_REMOTE_END_RESULT;
  }

  return ENDED_RESULT;
};
