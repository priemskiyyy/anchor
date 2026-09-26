import type { AnchorDiagnosticType } from "@priemskiyyy/anchor";

import type { Tone } from "example-shared/types/Tone";

/** One line of the lab's timeline: a diagnostic event of an Anchor, or what one of Harbor's own calls got back. */
export type TimelineEntry = {
  id: number;
  timestamp: number;
  /** The diagnostic event's type, or `null` for a line Harbor recorded about its own call. */
  type: AnchorDiagnosticType | null;
  session: { key: string } | null;
  provider: { id: string; label: string };
  line: string;
  tone: Tone;
};
