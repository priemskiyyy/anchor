/**
 * The claims of a verified Firebase session cookie or ID token the adapter
 * reads: the project, the user with its profile, and how the user signed in.
 *
 * @example
 * ```ts
 * const token: FirebaseDecodedTokenLike = await auth.verifySessionCookie(sessionCookie, true);
 * ```
 */
export type FirebaseDecodedTokenLike = {
  /** The Firebase project id, whose ID tokens `https://securetoken.google.com/<aud>` issues. */
  aud: string;
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  phone_number?: string;
  firebase: {
    /** How the user signed in, such as `password`, `google.com` or `anonymous`. */
    sign_in_provider: string;
    tenant?: string;
  };
};
