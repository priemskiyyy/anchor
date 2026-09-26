import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of MSAL, which also keys its sessions in the world. */
export const MSAL_ID = "msal";

/** The cloud MSAL caches every account under, which is the principal's authority. */
export const MSAL_ENVIRONMENT = "login.windows.net";

/** Where MSAL signs in to one tenant, followed by the tenant id. */
export const MSAL_AUTHORITY_ORIGIN = "https://login.microsoftonline.com/";

/** Each organization's Microsoft Entra tenant: Harbor Labs and Summit Works run one each. */
export const MSAL_TENANTS: Record<OrganizationId, string> = {
  harbor: "6c2a1f8e-4b7d-4e3a-9c5f-1d2e3f4a5b6c",
  summit: "9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b",
};

/** Each person's object id in their home tenant. */
export const MSAL_OBJECT_IDS: Record<PersonId, string> = {
  ada: "2f4e6a8c-ada0-4b1d-9e3f-5a7c9e1b3d5f",
  grace: "7b9d1f3a-9ace-4c2e-8f4a-6b8d0f2a4c6e",
};

/** The scope of Harbor's API, which every access token is for. */
export const MSAL_API_SCOPES = ["api://harbor/projects.read"];

/** What the simulated client prefixes its access tokens with. */
export const MSAL_TOKEN_PREFIX = "msal-access-token";
