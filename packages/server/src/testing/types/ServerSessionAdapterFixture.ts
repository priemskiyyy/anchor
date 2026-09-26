import type { ServerSessionAdapter } from "src/types/ServerSessionAdapter";

/**
 * One server adapter under test over a fake or in-process server SDK, and the
 * controls the conformance suite drives that server with.
 *
 * @example
 * ```ts
 * const fixture: ServerSessionAdapterFixture<User, typeof auth> = {
 *   adapter: betterAuth({ sdk: auth }),
 *   native: auth,
 *   signIn: async (name) => signUpAndGetCookie(auth, name),
 *   signOut: async (headers) => auth.api.signOut({ headers }),
 * };
 * ```
 */
export type ServerSessionAdapterFixture<TUser, TNative> = {
  adapter: ServerSessionAdapter<TUser, TNative>;
  /** The page every request of the suite asks for, `https://app.example.com/` unless the server accepts only another origin. */
  url?: string;
  /** The server SDK the fixture gave the adapter. */
  native: TNative;
  /** Signs a new user in on the server and answers the request headers that carry the session, and the subject the provider gave the user. */
  signIn: (
    name: string,
  ) =>
    | { headers: Headers; subject: string }
    | Promise<{ headers: Headers; subject: string }>;
  /** Ends, on the server, the session these request headers carry, as a sign-out elsewhere would. */
  signOut: (headers: Headers) => void | Promise<void>;
};
