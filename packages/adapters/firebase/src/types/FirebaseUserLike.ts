/**
 * The parts of a Firebase `User` the adapter reads: its identity, the profile
 * fields of the default user, and `getIdToken`.
 *
 * @example
 * ```ts
 * const user: FirebaseUserLike | null = auth.currentUser;
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
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};
