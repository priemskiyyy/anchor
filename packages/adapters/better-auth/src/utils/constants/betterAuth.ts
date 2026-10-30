/** The adapter's name in diagnostics. */
export const BETTER_AUTH_ADAPTER_NAME = "better-auth";

/** The authority of every Better Auth principal; Better Auth user ids are random, unique across deployments in practice. */
export const BETTER_AUTH_AUTHORITY = "better-auth";

/** The status Better Auth answers get-session with after deleting a session cookie it could not refresh, which its own session atom takes for no session. */
export const UNAUTHORIZED_STATUS = 401;

/** Milliseconds ending waits for the session atom to refresh before it signs out against the session the atom holds, so a slow network never holds up a sign-out. */
export const END_REFRESH_BUDGET = 2_000;
