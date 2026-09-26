import type { Organization } from "example-shared/world/types/Organization";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";

/** The two made-up organizations both people belong to. */
export const ORGANIZATIONS: Record<OrganizationId, Organization> = {
  harbor: { id: "harbor", name: "Harbor Labs" },
  summit: { id: "summit", name: "Summit Works" },
};

/** Every organization, in the order the switcher lists them. */
export const ORGANIZATION_IDS: OrganizationId[] = ["harbor", "summit"];
