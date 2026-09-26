import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";

/** One way to make the provider misbehave, as the panel lists it. */
export type Misbehavior = {
  id: MisbehaviorId;
  kind: "action" | "switch";
  label: string;
  description: string;
  /** The guarantee its notice names once the misbehavior ran. */
  guarantee: string;
  /** What the session must be for the misbehavior to make sense. */
  needs: "session" | "signed-in" | null;
};
