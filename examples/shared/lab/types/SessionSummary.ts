import type { Principal, SessionState } from "@priemskiyyy/anchor";

import type { OrganizationId } from "example-shared/world/types/OrganizationId";

/** What the lab compares between two session states to say why the key changed. */
export type SessionSummary = {
  runtime: { id: number };
  status: SessionState<unknown, never>["status"];
  key: string | null;
  principal: Principal | null;
  name: string | null;
  /** The organization the provider holds the session in, from the world, or `null`. */
  organization: OrganizationId | null;
};
