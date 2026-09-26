import type { SessionState } from "src/types/SessionState";
import type { SyncHintSession } from "src/types/SyncHintSession";
import { getAcceptedSession } from "src/utils/internal/runtime/getAcceptedSession";

export const getSyncHintSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): SyncHintSession =>
  Object.freeze({
    status: state.status,
    key: getAcceptedSession(state)?.key ?? null,
  });
