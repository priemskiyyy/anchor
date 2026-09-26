import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import { getSettledSessionState } from "src/utils/getSettledSessionState";
import { isUnauthorizedError } from "src/utils/isUnauthorizedError";

// The atom's own fetch, never a second getSession(): the Expo plugin restores its cached session inside it, and abandons the restore when another fetch moved the atom first.
export const getRefreshedSession = async (
  atom: BetterAuthSessionAtomLike,
  signal: AbortSignal,
) => {
  await atom.get().refetch();

  const { data, error } = await getSettledSessionState(atom, signal);

  if (error === null || isUnauthorizedError(error)) {
    return data;
  }

  // The server could not be asked, and the client still holds a session: the one it answered last, or the Expo plugin's cache.
  if (data !== null) {
    return data;
  }

  throw error;
};
