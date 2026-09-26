import { CircleNotch } from "@phosphor-icons/react";
import type React from "react";

export const RestoringScreen: React.FunctionComponent = () => (
  <div role="status" className="flex flex-col gap-4">
    <p className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <CircleNotch
        aria-hidden="true"
        size={16}
        weight="bold"
        className="motion-safe:animate-spin"
      />
      Restoring your session
    </p>
    <div className="flex items-center gap-3">
      <span className="size-9 rounded-full bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
      <span className="h-4 w-40 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
    </div>
    <div className="h-24 rounded-xl bg-zinc-200/70 motion-safe:animate-pulse dark:bg-zinc-800/70" />
  </div>
);
