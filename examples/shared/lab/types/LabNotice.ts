import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import type { Tone } from "example-shared/types/Tone";

/** What the lab says after the fact: the guarantee that held and what the provider did, or why something could not finish. */
export type LabNotice = {
  id: number;
  title: string;
  body: string;
  tone: Tone;
  /** The misbehavior whose card shows it, or `null` for a notice about the whole lab. */
  misbehavior: MisbehaviorId | null;
};
