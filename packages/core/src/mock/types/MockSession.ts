import type { SessionObserver } from "src/types/SessionObserver";

/**
 * What one opened mock session recorded: the observer it was opened with and
 * how many times it was disposed.
 *
 * @example
 * ```ts
 * expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([1]);
 * ```
 */
export type MockSession<TUser> = {
  observer: SessionObserver<TUser>;
  disposeCount: number;
};
