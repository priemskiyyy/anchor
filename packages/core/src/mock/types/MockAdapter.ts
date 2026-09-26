import type { MockEnd } from "src/mock/types/MockEnd";
import type { MockRead } from "src/mock/types/MockRead";
import type { MockSession } from "src/mock/types/MockSession";
import type { MockTokenCall } from "src/mock/types/MockTokenCall";
import type { SessionAdapter } from "src/types/SessionAdapter";
import type { SessionAnswer } from "src/types/SessionAnswer";

/**
 * The mock adapter and its controls: the recorded sessions and calls, and a
 * provider whose state a test changes with or without telling the observers.
 *
 * @example
 * ```ts
 * const mock = createMockAdapter<{ name: string }>();
 * const anchor = new Anchor({ adapter: mock.adapter });
 *
 * await anchor.start();
 * mock.push(signedIn);
 * ```
 */
export type MockAdapter<TUser, TProfile extends string> = {
  adapter: SessionAdapter<TUser, { name: string }, TProfile>;
  sessions: MockSession<TUser>[];
  reads: MockRead<TUser>[];
  tokens: MockTokenCall<TProfile>[];
  ends: MockEnd[];
  /** What the provider holds now. */
  current: () => SessionAnswer<TUser>;
  /** The provider changes and tells every open observer. */
  push: (answer: SessionAnswer<TUser>) => void;
  /** The provider changes without telling anyone, as an SDK that emits nothing. */
  change: (answer: SessionAnswer<TUser>) => void;
  /** Tells every open observer that something changed, without saying what. */
  invalidate: () => void;
};
