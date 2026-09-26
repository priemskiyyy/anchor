import { cva } from "class-variance-authority";

import type { Tone } from "example-shared/types/Tone";

export const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
  {
    variants: {
      tone: {
        neutral:
          "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
        positive:
          "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
        warning:
          "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
        danger:
          "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
        accent:
          "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-800",
        info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900",
      } satisfies Record<Tone, string>,
    },
    defaultVariants: { tone: "neutral" },
  },
);
