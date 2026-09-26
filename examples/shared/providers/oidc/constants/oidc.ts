import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of the OpenID Connect provider, which also keys its sessions in the world. */
export const OIDC_ID = "oidc";

/** The issuer of the simulated provider's ID tokens, on a domain reserved for examples. */
export const OIDC_ISSUER = "https://id.harbor.example";

/** The end-session endpoint the provider publishes in its metadata. */
export const OIDC_END_SESSION_ENDPOINT = "https://id.harbor.example/logout";

/** The client id Harbor registered with the provider. */
export const OIDC_CLIENT_ID = "harbor-web";

/** Each person's subject at the provider. */
export const OIDC_SUBJECTS: Record<PersonId, string> = {
  ada: "5f0c1d2e-ada0-4b7a-9c3d-0a1b2c3d4e5f",
  grace: "8e7d6c5b-9ace-4a3b-8c2d-1f0e9d8c7b6a",
};

/** Each organization's id in the `org_id` claim. */
export const OIDC_ORGANIZATIONS: Record<OrganizationId, string> = {
  harbor: "harbor-labs",
  summit: "summit-works",
};

/** What the simulated UserManager prefixes its access tokens with. */
export const OIDC_TOKEN_PREFIX = "oidc-access-token";
