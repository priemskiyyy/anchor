import { useAnchor, useSession } from "@priemskiyyy/anchor-react";
import clsx from "clsx";
import type React from "react";

import { STATUS_LABELS } from "example-shared/lab/constants/labels";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { Field } from "src/components/Common/Field";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { SessionStatusBadge } from "src/components/Common/SessionStatusBadge";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const SessionCard: React.FunctionComponent = () => {
  const state = useSession();
  const { session: diagnosed } = useObservable(useAnchor().diagnostics);
  const change = useObservable(useLab().sessionChange);
  const session = getAcceptedSession(state);

  return (
    <HighlightFrame target="session-card">
      <section
        aria-label="Session"
        className={clsx("flex flex-col gap-3 p-4", CARD_CLASS_NAME)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Session</h3>
          <SessionStatusBadge />
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
          <Field label="Status" value={STATUS_LABELS[state.status]} />
          <Field label="Key" value={session?.key ?? "none"} />
          <Field label="Generation" value={`#${diagnosed.generation}`} />
          <Field
            label="Authority"
            value={session?.principal.authority ?? "none"}
          />
          <Field label="Subject" value={session?.principal.subject ?? "none"} />
          {state.status === "action-required" ? (
            <Field label="Action" value={state.action.kind} />
          ) : null}
          {state.status === "unavailable" ? (
            <Field label="Error" value={state.error.code} />
          ) : null}
        </dl>
        <div role="status" aria-label="Key change">
          {change === null ? null : (
            <p
              key={change.id}
              className={clsx(
                "rounded-lg px-3 py-2 text-sm motion-safe:animate-flash",
                change.kind === "same-key"
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
              )}
            >
              {change.reason}
            </p>
          )}
        </div>
      </section>
    </HighlightFrame>
  );
};
