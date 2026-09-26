/** The adapter's name in diagnostics. */
export const KEYCLOAK_ADAPTER_NAME = "keycloak";

/** How long, in seconds as keycloak-js counts, an access token must stay valid before it is handed over; one expiring sooner is refreshed first. */
export const TOKEN_MIN_VALIDITY = 30;

/** The minimum validity keycloak-js reads as a refresh whatever the token has left. */
export const FORCED_REFRESH = -1;

/** keycloak-js sends Keycloak's access tokens as bearer credentials. */
export const ACCESS_TOKEN_SCHEME = "Bearer";

/** The status Keycloak refuses a refresh token with once its session ended, on which keycloak-js clears its tokens. */
export const REFRESH_REFUSED_STATUS = 400;
