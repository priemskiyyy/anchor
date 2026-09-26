import type { DiagnosticOperation } from "@priemskiyyy/anchor";
import { match } from "ts-pattern";

import { formatShortKey } from "example-shared/formatting/formatShortKey";

const formatWaiters = (waiters: number) =>
  waiters === 1 ? "1 caller waits" : `${waiters} callers wait`;

/** One operation Anchor is waiting on, in plain words, with its session shortened. */
export const describeOperation = (operation: DiagnosticOperation) =>
  match(operation)
    .with(
      { kind: "read", queued: false },
      ({ waiters }) => `Reading the session: ${formatWaiters(waiters)}`,
    )
    .with(
      { kind: "read", queued: true },
      ({ waiters }) => `Reading again next: ${formatWaiters(waiters)}`,
    )
    .with(
      { kind: "token" },
      ({ profile, forceRefresh, session, waiters }) =>
        `${forceRefresh ? "A fresh" : "An"} ${profile} token for ${formatShortKey(session.key)}: ${formatWaiters(waiters)}`,
    )
    .with(
      { kind: "end" },
      ({ session }) => `Ending the session ${formatShortKey(session.key)}`,
    )
    .exhaustive();
