import { cva } from "class-variance-authority";

import type { Tone } from "example-shared/types/Tone";

/** A person's initials or a provider's monogram on a tile of its tone. */
export const monogramStyles = cva(
  "inline-flex shrink-0 items-center justify-center font-semibold tracking-tight",
  {
    variants: {
      tone: {
        neutral:
          "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100",
        positive:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200",
        danger:
          "bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200",
        accent:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200",
        info: "bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200",
      } satisfies Record<Tone, string>,
      shape: {
        round: "size-9 rounded-full text-sm",
        tile: "size-8 rounded-lg text-xs",
      },
    },
    defaultVariants: { tone: "neutral", shape: "tile" },
  },
);
