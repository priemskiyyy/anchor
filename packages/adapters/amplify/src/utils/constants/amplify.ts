/** The adapter's name in diagnostics. */
export const AMPLIFY_ADAPTER_NAME = "amplify";

/** The Hub channel Amplify reports every sign-in, token refresh and sign-out on. */
export const AUTH_CHANNEL = "auth";

/** The Hub event Amplify dispatches once it cleared this device's session. */
export const SIGNED_OUT_EVENT = "signedOut";

/** The error `getCurrentUser()` throws when Amplify holds no signed-in user. */
export const USER_UNAUTHENTICATED_EXCEPTION = "UserUnAuthenticatedException";

/** Cognito answers its access tokens with the token type Bearer. */
export const ACCESS_TOKEN_SCHEME = "Bearer";

/** The errors after which Amplify clears the tokens because only a new sign-in helps: a refresh token Cognito refused, revoked or rotated away, or a user who is gone, unconfirmed or must reset the password. */
export const INTERACTION_ERRORS = Object.freeze({
  NotAuthorizedException: true,
  TokenRevokedException: true,
  UserNotFoundException: true,
  PasswordResetRequiredException: true,
  UserNotConfirmedException: true,
  RefreshTokenReuseException: true,
});
