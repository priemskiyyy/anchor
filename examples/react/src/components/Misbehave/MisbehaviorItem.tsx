import clsx from "clsx";
import type React from "react";
import { useId } from "react";

import type { LabNotice } from "example-shared/lab/types/LabNotice";
import type { Misbehavior } from "example-shared/lab/types/Misbehavior";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { NoticeCard } from "src/components/Common/NoticeCard";
import { MISBEHAVIOR_ICONS } from "src/utils/constants/icons";

type MisbehaviorItemProps = {
  misbehavior: Misbehavior;
  available: boolean;
  note: string;
  on: boolean;
  running: boolean;
  blocked: boolean;
  /** What this misbehavior did the last time it ran, shown after the fact. */
  result: LabNotice | undefined;
  onPress: () => void;
  onDismissResult: (id: number) => void;
};

export const MisbehaviorItem: React.FunctionComponent<MisbehaviorItemProps> = ({
  misbehavior,
  available,
  note,
  on,
  running,
  blocked,
  result,
  onPress,
  onDismissResult,
}) => {
  const descriptionId = useId();
  const MisbehaviorIcon = MISBEHAVIOR_ICONS[misbehavior.id];
  const isSwitch = misbehavior.kind === "switch";

  return (
    <li
      className={clsx(
        "flex flex-col gap-2 rounded-xl border p-3",
        available
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-dashed border-zinc-300 dark:border-zinc-700",
      )}
    >
      <button
        type="button"
        role={isSwitch ? "switch" : undefined}
        aria-checked={isSwitch ? on : undefined}
        aria-describedby={descriptionId}
        disabled={!available || blocked}
        onClick={onPress}
        className={buttonStyles({ pressed: on, size: "block" })}
      >
        <MisbehaviorIcon
          aria-hidden="true"
          size={16}
          weight="bold"
          className="shrink-0"
        />
        {running ? "Working…" : misbehavior.label}
      </button>
      <p
        id={descriptionId}
        className={clsx(
          "text-sm leading-relaxed",
          available
            ? "text-zinc-600 dark:text-zinc-400"
            : "text-zinc-500 italic dark:text-zinc-500",
        )}
      >
        {note}
      </p>
      <div aria-live="polite" className="empty:hidden">
        {result === undefined ? null : (
          <NoticeCard
            notice={result}
            onDismiss={() => onDismissResult(result.id)}
          />
        )}
      </div>
    </li>
  );
};
