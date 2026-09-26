import type { SessionAnswer } from "src/types/SessionAnswer";

/**
 * The callbacks an adapter reports into. `session` pushes a complete answer;
 * `invalidate` asks the core to read because something changed that the
 * adapter cannot describe. Both may be called from inside `open`.
 *
 * @example
 * ```ts
 * const handleAuthChange = (user: User | null) => observer.session(getAnswer(user));
 * ```
 */
export type SessionObserver<TUser> = {
  session: (answer: SessionAnswer<TUser>) => void;
  invalidate: () => void;
};
