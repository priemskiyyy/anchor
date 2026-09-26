import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** Who a token was minted for, frozen when it was minted, as Harbor's API reads it. */
export type IssuedToken = {
  session: { id: string };
  person: PersonId;
  organization: OrganizationId | null;
};
