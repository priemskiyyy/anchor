import type { PersonId } from "example-shared/world/types/PersonId";

/** What Harbor is waiting on, so the screen can say so and hold its buttons. */
export type HarborTask =
  | { kind: "sign-in"; person: PersonId }
  | { kind: "sign-out" }
  | { kind: "organization" }
  | { kind: "rename" }
  | { kind: "retry" }
  | { kind: "action" };
