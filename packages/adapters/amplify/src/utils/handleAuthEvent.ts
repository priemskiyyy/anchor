import type { SessionObserver } from "@priemskiyyy/anchor";

import { SIGNED_OUT_EVENT } from "src/utils/constants/amplify";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";

export const handleAuthEvent = <TUser>(
  observer: SessionObserver<TUser>,
  { payload }: { payload: { event: string } },
) => {
  // Amplify dispatches signedOut without awaiting its token store's clearing, which on React Native's AsyncStorage may still run, so a read could find the old tokens.
  if (payload.event === SIGNED_OUT_EVENT) {
    observer.session(SIGNED_OUT_ANSWER);

    return;
  }

  observer.invalidate();
};
