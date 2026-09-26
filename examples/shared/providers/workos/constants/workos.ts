import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of WorkOS, which also keys its sessions in the world. */
export const WORKOS_ID = "workos";

/** Each person's WorkOS user id. */
export const WORKOS_USER_IDS: Record<PersonId, string> = {
  ada: "user_01HADAM0REAU7KQL9PX4VT3N",
  grace: "user_01HGRACE0KAF0R3ND8SW1ZQ5",
};

/** Each organization's WorkOS organization id. */
export const WORKOS_ORGANIZATION_IDS: Record<OrganizationId, string> = {
  harbor: "org_01HHARBORLABS5TR8WQ2M7K",
  summit: "org_01HSUMMITWORKS9MK3XZ7P4J",
};

/** What the simulated WorkOS prefixes its access tokens with. */
export const WORKOS_TOKEN_PREFIX = "workos-access-token";
