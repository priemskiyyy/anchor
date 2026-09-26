import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Better Auth, which also keys its sessions in the world. */
export const BETTER_AUTH_ID = "better-auth";

/** Each person's Better Auth user id. */
export const BETTER_AUTH_USER_IDS: Record<PersonId, string> = {
  ada: "u_ada0Mr7xKq2Lp9",
  grace: "u_grc6Ok3wBn8Zt4",
};

/** What Better Auth's session endpoint answers once the session it was sent ended on the server. */
export const UNAUTHORIZED_ERROR = { status: 401, statusText: "UNAUTHORIZED" };

/** What Better Auth answers a sign-in whose request never reached the server. */
export const FETCH_FAILED_ERROR = { status: 0, statusText: "Failed to fetch" };
