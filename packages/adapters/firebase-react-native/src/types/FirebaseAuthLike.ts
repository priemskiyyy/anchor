import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

/**
 * The parts of the React Native Firebase `Auth` instance the adapter calls.
 * Pass the instance `getAuth()` returned; the adapter never initializes,
 * configures or signs in with it.
 *
 * @example
 * ```ts
 * const sdk: FirebaseAuthLike = getAuth();
 * ```
 */
export type FirebaseAuthLike = {
  app: { options: { projectId?: string } };
  currentUser: FirebaseUserLike | null;
  /** Settles once the native SDK reported the user it restored, or that it restored none. */
  authStateReady: () => Promise<void>;
  onIdTokenChanged: (
    next: (user: FirebaseUserLike | null) => void,
  ) => () => void;
  signOut: () => Promise<void>;
};
