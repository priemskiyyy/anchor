import { AnchorError } from "@priemskiyyy/anchor";

import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import type { BetterAuthSessionStateLike } from "src/types/BetterAuthSessionStateLike";
import { isFetchSettled } from "src/utils/isFetchSettled";

export const getSettledSessionState = (
  atom: BetterAuthSessionAtomLike,
  signal: AbortSignal,
) =>
  new Promise<BetterAuthSessionStateLike>((resolve, reject) => {
    const current = atom.get();

    if (isFetchSettled(current)) {
      resolve(current);

      return;
    }

    const handleAbort = () => {
      unlisten();
      reject(
        new AnchorError({
          code: "ABORTED",
          message: "The read stopped waiting for Better Auth's session fetch.",
        }),
      );
    };

    const unlisten = atom.listen((value) => {
      if (!isFetchSettled(value)) {
        return;
      }

      unlisten();
      signal.removeEventListener("abort", handleAbort);
      resolve(value);
    });

    signal.addEventListener("abort", handleAbort);
  });
