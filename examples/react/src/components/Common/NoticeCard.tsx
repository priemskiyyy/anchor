import { CheckCircle, Warning, X } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import type { LabNotice } from "example-shared/lab/types/LabNotice";

type NoticeCardProps = { notice: LabNotice; onDismiss: () => void };

// In the flow of the page, beside what it is about, so it never covers the lab.
export const NoticeCard: React.FunctionComponent<NoticeCardProps> = ({
  notice,
  onDismiss,
}) => {
  const { title, body, tone } = notice;
  const danger = tone === "danger";
  const NoticeIcon = danger ? Warning : CheckCircle;

  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
        danger
          ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
      )}
    >
      <NoticeIcon
        aria-hidden="true"
        size={18}
        weight="fill"
        className={clsx(
          "mt-0.5 shrink-0",
          danger ? "text-rose-600" : "text-emerald-600",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">{title}</p>
        <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Dismiss ${title}`}
        onClick={onDismiss}
        className="rounded-md p-1 text-zinc-500 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-zinc-800"
      >
        <X aria-hidden="true" size={14} weight="bold" />
      </button>
    </div>
  );
};
