import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** One session on a provider's server, as the provider's own backend keeps it. */
export type ServerSession = {
  id: string;
  provider: string;
  person: PersonId;
  /** The active organization, or `null` for a provider whose sessions name none. */
  organization: OrganizationId | null;
  /** The step the server blocks the session on, such as `setup-mfa`, or `null`. */
  action: string | null;
  ended: boolean;
};
