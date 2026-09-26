import { AnchorError } from "@priemskiyyy/anchor";

import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionLike } from "src/types/ClerkSessionLike";

const settleLoadedSession = (
  sdk: ClerkLike,
  resolve: (session: ClerkSessionLike | null) => void,
  reject: (error: Error) => void,
) => {
  if (sdk.status === "error") {
    reject(
      new Error("Clerk failed to load, so it cannot tell who is signed in."),
    );

    return true;
  }

  const { session } = sdk;

  if (!sdk.loaded || session === undefined) {
    return false;
  }

  resolve(session);

  return true;
};

export const getLoadedSession = (sdk: ClerkLike, signal: AbortSignal) =>
  new Promise<ClerkSessionLike | null>((resolve, reject) => {
    if (settleLoadedSession(sdk, resolve, reject)) {
      return;
    }

    const handleChange = () => {
      if (!settleLoadedSession(sdk, resolve, reject)) {
        return;
      }

      stopWaiting();
    };

    const handleAbort = () => {
      stopWaiting();
      reject(
        new AnchorError({
          code: "ABORTED",
          message: "The read stopped waiting for Clerk to load.",
        }),
      );
    };

    const removeListener = sdk.addListener(handleChange, {
      skipInitialEmit: true,
    });

    const stopWaiting = () => {
      removeListener();
      signal.removeEventListener("abort", handleAbort);
      // clerk-js splices its status handlers while it calls them, so removing one there would skip the next.
      queueMicrotask(() => sdk.off("status", handleChange));
    };

    sdk.on("status", handleChange);
    signal.addEventListener("abort", handleAbort);
  });
