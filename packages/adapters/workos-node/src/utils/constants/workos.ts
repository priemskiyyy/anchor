/** The adapter's name in diagnostics. */
export const WORKOS_ADAPTER_NAME = "workos-node";

/** The authority of every WorkOS principal, the same as the client adapter's, so one user is one principal on both sides. */
export const WORKOS_AUTHORITY = "workos";

/** The cookie the sealed session lives in by default, as AuthKit and WorkOS's guides name it. */
export const DEFAULT_SESSION_COOKIE = "wos-session";

/** The reason `authenticate()` answers for a sealed session whose access token no longer verifies, which a refresh renews. */
export const EXPIRED_ACCESS_TOKEN_REASON = "invalid_jwt";

/** The attributes WorkOS's session guide sets the sealed session cookie with. */
export const SESSION_COOKIE_ATTRIBUTES =
  "Path=/; HttpOnly; Secure; SameSite=Lax";
