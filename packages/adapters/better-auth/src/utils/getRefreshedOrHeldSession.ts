import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { END_REFRESH_BUDGET } from "src/utils/constants/betterAuth";
import { getRefreshedSession } from "src/utils/getRefreshedSession";

// Ending must not wait on the network: a refresh that fails or outlives the budget leaves the session the atom holds, which is none when it holds none.
export const getRefreshedOrHeldSession = (
  atom: BetterAuthSessionAtomLike,
  signal: AbortSignal,
) =>
  new Promise<BetterAuthSessionLike | null>((resolve) => {
    const timer = setTimeout(
      () => resolve(atom.get().data),
      END_REFRESH_BUDGET,
    );

    const handleSettled = (data: BetterAuthSessionLike | null) => {
      clearTimeout(timer);
      resolve(data);
    };

    getRefreshedSession(atom, signal).then(handleSettled, () =>
      handleSettled(atom.get().data),
    );
  });
