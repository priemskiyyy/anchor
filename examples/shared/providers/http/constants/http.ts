import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of your own backend, which also keys its sessions in the world. */
export const HTTP_ID = "http";

/** Each person's user id on your backend. */
export const HTTP_SUBJECTS: Record<PersonId, string> = {
  ada: "user_ada",
  grace: "user_grace",
};

/** What your backend's token endpoint prefixes its tokens with. */
export const HTTP_TOKEN_PREFIX = "harbor-api-token";

/** The step your backend blocks a session on until two-factor is set up. */
export const SETUP_MFA_ACTION = "setup-mfa";
