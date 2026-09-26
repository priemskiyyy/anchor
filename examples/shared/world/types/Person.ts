import type { Tone } from "example-shared/types/Tone";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

export type Person = {
  id: PersonId;
  firstName: string;
  name: string;
  /** The display name a rename switches to, and back from. */
  shortName: string;
  email: string;
  initials: string;
  tone: Tone;
  /** The organization a provider without organizations answers the person in. */
  organization: OrganizationId;
};
