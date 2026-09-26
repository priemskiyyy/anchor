import { cva } from "class-variance-authority";

import type { Tone } from "example-shared/types/Tone";

export const dotStyles = cva("size-2 shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-zinc-400",
      positive: "bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.2)]",
      warning: "bg-amber-500 motion-safe:animate-pulse",
      danger: "bg-rose-500 shadow-[0_0_0_3px_rgb(244_63_94/0.25)]",
      accent: "bg-blue-500",
      info: "bg-sky-500 motion-safe:animate-pulse",
    } satisfies Record<Tone, string>,
  },
});
