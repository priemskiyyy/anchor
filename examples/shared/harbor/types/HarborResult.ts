import type { Tone } from "example-shared/types/Tone";

/** What one of Harbor's own calls got back, for the lab's timeline. */
export type HarborResult = {
  session: { key: string };
  line: string;
  tone: Tone;
};
