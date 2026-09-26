/**
 * A token of Amplify's auth session as `fetchAuthSession()` answers it: the
 * decoded payload, whose issuer, subject and `origin_jti` name the session,
 * and `toString()`, which answers the token itself.
 *
 * @example
 * ```ts
 * const idToken: AmplifyJwtLike | undefined = (await fetchAuthSession()).tokens?.idToken;
 * ```
 */
export type AmplifyJwtLike = {
  payload: {
    /** The user pool that issued the token, such as `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf`. */
    iss?: string;
    sub?: string;
    /** The revocation id of the refresh token the token came from: the same across refreshes, new with every sign-in. */
    origin_jti?: unknown;
  };
  toString: () => string;
};
