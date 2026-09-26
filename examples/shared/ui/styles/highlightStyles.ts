import { cva } from "class-variance-authority";

/** The ring a tour step puts around what proves its point. */
export const highlightStyles = cva("rounded-xl transition-shadow", {
  variants: {
    highlighted: {
      true: "ring-2 ring-blue-500 ring-offset-4 ring-offset-zinc-50 dark:ring-blue-400 dark:ring-offset-zinc-950",
      false: "",
    },
  },
  defaultVariants: { highlighted: false },
});
