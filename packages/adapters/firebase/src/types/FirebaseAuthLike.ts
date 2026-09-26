import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

/**
 * The parts of the modular Firebase `Auth` instance the adapter calls. Pass the
 * `getAuth(app)` your application initialized; the adapter never initializes,
 * configures or signs in with it.
 *
 * @example
 * ```ts
 * const sdk: FirebaseAuthLike = getAuth(app);
 * ```
 */
export type FirebaseAuthLike = {
  app: { options: { projectId?: string } };
  currentUser: FirebaseUserLike | null;
  authStateReady: () => Promise<void>;
  onIdTokenChanged: (
    next: (user: FirebaseUserLike | null) => void,
  ) => () => void;
  signOut: () => Promise<void>;
};
