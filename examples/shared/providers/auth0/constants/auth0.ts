import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Auth0, which also keys its sessions in the world. */
export const AUTH0_ID = "auth0";

/** The issuer of the simulated tenant's ID tokens, on Auth0's domain for a made-up tenant. */
export const AUTH0_ISSUER = "https://harbor-lab.us.auth0.com/";

/** The client id Harbor registered with the tenant. */
export const AUTH0_CLIENT_ID = "harbor-spa";

/** Each person's Auth0 user id. */
export const AUTH0_SUBJECTS: Record<PersonId, string> = {
  ada: "auth0|66f1ada0c3f15d6e4f708a9b",
  grace: "auth0|66f16ace7e112b3c4d5e9f60",
};

/** Each organization's Auth0 organization id. */
export const AUTH0_ORGANIZATIONS: Record<OrganizationId, string> = {
  harbor: "org_hb7Qx2HarborLabs",
  summit: "org_sm4Kp9SummitWork",
};

/** What the simulated client prefixes its access tokens with. */
export const AUTH0_TOKEN_PREFIX = "auth0-access-token";
