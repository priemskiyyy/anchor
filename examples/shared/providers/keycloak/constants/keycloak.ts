import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Keycloak, which also keys its sessions in the world. */
export const KEYCLOAK_ID = "keycloak";

/** The issuer of the simulated realm's tokens, on a domain reserved for examples. */
export const KEYCLOAK_ISSUER = "https://sso.harbor.example/realms/harbor";

/** The realm's logout page, which keycloak-js builds the GET form of. */
export const KEYCLOAK_LOGOUT_ENDPOINT = `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;

/** The client id Harbor registered in the realm. */
export const KEYCLOAK_CLIENT_ID = "harbor-web";

/** Each person's user id in the realm. */
export const KEYCLOAK_SUBJECTS: Record<PersonId, string> = {
  ada: "0b5e9c7a-ada1-4f2e-8d3c-5a6b7c8d9e0f",
  grace: "3c4d5e6f-9ace-4b1a-9e8d-7c6b5a4f3e2d",
};

/** Each organization's alias in the `organization` claim of Keycloak 26. */
export const KEYCLOAK_ORGANIZATIONS: Record<OrganizationId, string> = {
  harbor: "harbor-labs",
  summit: "summit-works",
};

/** What the simulated instance prefixes its access tokens with. */
export const KEYCLOAK_TOKEN_PREFIX = "keycloak-access-token";

/** The scope that asks Keycloak 26 for one organization, followed by its alias. */
export const ORGANIZATION_SCOPE = "organization:";

/** The minimum validity keycloak-js reads as a refresh whatever the token has left. */
export const FORCED_REFRESH = -1;
