/**
 * The parts of a React Native Firebase `User` the adapter reads: its identity,
 * the profile fields of the default user, and `getIdTokenResult`.
 *
 * @example
 * ```ts
 * const user: FirebaseUserLike | null = getAuth().currentUser;
 * ```
 */
export type FirebaseUserLike = {
  uid: string;
  isAnonymous: boolean;
  tenantId: string | null;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  /** Mints the ID token of whichever user the native SDK holds when it runs, with the claims the native SDK decoded from it. */
  getIdTokenResult: (
    forceRefresh?: boolean,
  ) => Promise<{ token: string; claims: { sub?: string } }>;
};
