import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Clerk, which also keys its sessions in the world. */
export const CLERK_ID = "clerk";

/** The instance's Frontend API host, on a domain reserved for examples; its URL is the tokens' issuer. */
export const CLERK_FRONTEND_API = "clerk.harbor.example";

/** Each person's Clerk user id. */
export const CLERK_USER_IDS: Record<PersonId, string> = {
  ada: "user_2hAdaM0reau7KqL9pX4vT",
  grace: "user_2hGrace0kafor3Nd8sW1z",
};

/** Each organization's Clerk organization id. */
export const CLERK_ORGANIZATION_IDS: Record<OrganizationId, string> = {
  harbor: "org_2hHarborLabs5tR8wQ2m",
  summit: "org_2hSummitWorks9mK3xZ7p",
};

/** The JWT template whose tokens Harbor's API accepts. */
export const CLERK_API_TEMPLATE = "harbor-api";

/** What the simulated Frontend API prefixes the template's tokens with. */
export const CLERK_TOKEN_PREFIX = "clerk-harbor-api-token";

/** Clerk's own name for the session task that waits for a second factor. */
export const SETUP_MFA_TASK = "setup-mfa";
