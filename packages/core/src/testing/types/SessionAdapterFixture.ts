import type { SessionAdapter } from "src/types/SessionAdapter";

/**
 * One adapter under test over a fake SDK, and the controls the conformance
 * suite drives that SDK with, as the application would natively.
 *
 * @example
 * ```ts
 * const fixture: SessionAdapterFixture<FirebaseSessionUser, FakeAuth, "api"> = {
 *   adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
 *   native: auth,
 *   profiles: ["api"],
 *   signIn: (subject) => auth.signIn(subject),
 *   signOut: () => auth.signOut(),
 *   listeners: () => auth.listeners.size,
 *   observes: true,
 * };
 * ```
 */
export type SessionAdapterFixture<TUser, TNative, TProfile extends string> = {
  adapter: SessionAdapter<TUser, TNative, TProfile>;
  /** The SDK the fixture gave the adapter. */
  native: TNative;
  /** Every token profile the adapter declares, so the suite can mint each one. */
  profiles: TProfile[];
  /** Signs a user in through the fake SDK, so the provider holds a session whose subject is `subject`. */
  signIn: (subject: string) => void | Promise<void>;
  /** Signs out through the fake SDK, as the application would. */
  signOut: () => void | Promise<void>;
  /** How many listeners the adapter holds on the fake SDK right now. */
  listeners: () => number;
  /** Whether the adapter reports changes itself; `false` for an SDK that emits nothing, whose changes arrive by `sync()`. */
  observes: boolean;
  /** Switches the fake SDK to another subject without telling any listener, where the fake can. */
  switchSilently?: (subject: string) => void | Promise<void>;
};
