/** The adapter's name in diagnostics. */
export const WORKOS_ADAPTER_NAME = "workos";

/** The authority of every WorkOS principal; AuthKit exposes no issuer without decoding its token, and WorkOS user ids are unique across environments. */
export const WORKOS_AUTHORITY = "workos";

/** The message of authkit-js's LoginRequiredError, the one failure that says it holds no session: nothing to refresh, or a refresh WorkOS refused. */
export const LOGIN_REQUIRED_MESSAGE = "No access token available";

/** WorkOS access tokens are bearer credentials your API verifies against the WorkOS JWKS. */
export const ACCESS_TOKEN_SCHEME = "Bearer";
