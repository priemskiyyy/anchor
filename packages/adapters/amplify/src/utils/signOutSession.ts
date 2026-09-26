import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { AmplifyLike } from "src/types/AmplifyLike";
import { AUTH_CHANNEL, SIGNED_OUT_EVENT } from "src/utils/constants/amplify";
import {
  NOT_APPLICABLE_END_RESULT,
  SIGNED_OUT_END_RESULT,
  UNKNOWN_END_RESULT,
} from "src/utils/constants/answers";
import { getSessionTokens } from "src/utils/getSessionTokens";

export const signOutSession = async (
  sdk: AmplifyLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  if ((await getSessionTokens(sdk, session, false)) === null) {
    return NOT_APPLICABLE_END_RESULT;
  }

  const heard: { signedOut: boolean } = { signedOut: false };

  // On React Native, signOut() for a hosted UI sign-in returns without signing out when the user closes the logout page, so only Amplify's signedOut proves it.
  const stopListening = sdk.hub.listen(AUTH_CHANNEL, ({ payload }) => {
    if (payload.event !== SIGNED_OUT_EVENT) {
      return;
    }

    heard.signedOut = true;
  });

  try {
    await sdk.auth.signOut({ global: false });
  } finally {
    stopListening();
  }

  return heard.signedOut ? SIGNED_OUT_END_RESULT : UNKNOWN_END_RESULT;
};
