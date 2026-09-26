import type { DiagnosticOperation } from "@priemskiyyy/anchor";

import { formatSessionKey } from "src/formatting/formatSessionKey";
import { assertUnreachable } from "src/utils/assertUnreachable";

const formatWaiters = (waiters: number) => {
  if (waiters === 1) {
    return "1 waiter";
  }

  return `${waiters} waiters`;
};

export const formatOperationLine = (operation: DiagnosticOperation) => {
  if (operation.kind === "read") {
    const state = operation.queued ? "queued" : "active";

    return `read · ${state} · ${formatWaiters(operation.waiters)}`;
  }

  if (operation.kind === "token") {
    const refresh = operation.forceRefresh ? " · forced refresh" : "";

    return `token · ${operation.profile}${refresh} · ${formatWaiters(operation.waiters)} · key ${formatSessionKey(operation.session)}`;
  }

  if (operation.kind === "end") {
    return `end · key ${formatSessionKey(operation.session)}`;
  }

  return assertUnreachable(operation);
};
