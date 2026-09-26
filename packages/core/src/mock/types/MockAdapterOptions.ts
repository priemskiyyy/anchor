import type { SessionAnswer } from "src/types/SessionAnswer";
import type { SessionObserver } from "src/types/SessionObserver";

/**
 * Configures the mock adapter, which is well behaved by default and can be told
 * to hold its calls, leave methods out or fail to open.
 *
 * @example
 * ```ts
 * const mock = createMockAdapter({ answer: signedIn, tokens: { api: {} }, hold: { getToken: true } });
 * ```
 */
export type MockAdapterOptions<TUser, TProfile extends string> = {
  /** The adapter's name, `mock` by default. */
  name?: string;
  /** What the provider holds at first and an unheld read answers; `signed-out` by default. */
  answer?: SessionAnswer<TUser>;
  /** The token profiles the mock declares, by name. */
  tokens?: Record<TProfile, unknown>;
  /** Calls that wait for the test's `settle` or `fail`: `true` for every kind, or per kind. */
  hold?: boolean | { read?: boolean; getToken?: boolean; end?: boolean };
  /** `false` leaves `getToken` out of every session. */
  getToken?: boolean;
  /** `false` leaves `end` out of every session. */
  end?: boolean;
  /** Runs inside every `open` with the observer: throwing fails the start, pushing models an SDK that emits on registration. */
  onOpen?: (observer: SessionObserver<TUser>) => void;
};
