import type { Tone } from "example-shared/types/Tone";

/** Each tone's color, since React Native has no Tailwind classes to carry them. */
export const TONE_COLORS: Record<Tone, string> = {
  neutral: "#71717a",
  positive: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  accent: "#2563eb",
  info: "#0284c7",
};
