/** The adapter's name in diagnostics. */
export const BETTER_AUTH_ADAPTER_NAME = "better-auth-node";

/** The authority of every Better Auth principal, the same as the client adapter's, so one user is one principal on both sides. */
export const BETTER_AUTH_AUTHORITY = "better-auth";

/** The status Better Auth throws on get-session after deleting a session cookie it could not refresh, which is no session. */
export const UNAUTHORIZED_STATUS = 401;

/** Where better-call keeps the headers an endpoint set before it threw an APIError, such as the deletion of a session cookie. */
export const API_ERROR_HEADERS = Symbol.for("better-call:api-error-headers");
