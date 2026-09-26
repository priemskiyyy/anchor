/** The adapter's name in diagnostics. */
export const FIREBASE_ADAPTER_NAME = "firebase-node";

/** The issuer of every Firebase ID token, followed by the project id: the client adapter's authority, which a session cookie's own issuer is not. */
export const FIREBASE_ISSUER = "https://securetoken.google.com/";

/** The cookie the session cookie lives in by default, the one cookie Firebase Hosting forwards to Cloud Functions and Cloud Run. */
export const DEFAULT_SESSION_COOKIE = "__session";

/** The sign-in provider of an anonymous Firebase user. */
export const ANONYMOUS_PROVIDER = "anonymous";

/** The codes firebase-admin refuses a credential with that say the request has no session: expired or revoked, its user disabled, deleted or of another tenant. */
export const SIGNED_OUT_ERROR_CODES = Object.freeze([
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/mismatching-tenant-id",
]);

/** The code firebase-admin refuses a malformed, forged or foreign credential with, and a failure to fetch Google's public keys too. */
export const ARGUMENT_ERROR_CODE = "auth/argument-error";

/** How firebase-admin names each credential in the words of every refusal, and never in a failure to fetch Google's public keys. */
export const CREDENTIAL_NAMES = Object.freeze({
  "session-cookie": "session cookie",
  "id-token": "ID token",
});
