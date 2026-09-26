import type { BetterAuthSessionStateLike } from "src/types/BetterAuthSessionStateLike";
import { isFetchSettled } from "src/utils/isFetchSettled";
import { isUnauthorizedError } from "src/utils/isUnauthorizedError";

// A pending or refetching value repeats what the atom held before the fetch, and a failed fetch keeps it, so neither is news; a 401 empties it.
export const isAnsweredSessionState = (value: BetterAuthSessionStateLike) =>
  isFetchSettled(value) &&
  (value.error === null || isUnauthorizedError(value.error));
