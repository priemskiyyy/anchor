/** The adapter's name in diagnostics. */
export const AUTHJS_ADAPTER_NAME = "authjs";

/** The authority of every Auth.js principal; the client session names no issuer, and its user id is whatever your session callback puts there. */
export const AUTHJS_AUTHORITY = "authjs";

/** The localStorage key next-auth 4 broadcasts a session change to the application's other tabs under. */
export const SESSION_BROADCAST_KEY = "nextauth.message";

/** Where Auth.js answers by default, the `basePath` `SessionProvider` assumes. */
export const DEFAULT_BASE_PATH = "/api/auth";
