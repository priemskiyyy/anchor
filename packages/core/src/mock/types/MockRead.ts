import type { ReadContext } from "src/types/ReadContext";
import type { SessionAnswer } from "src/types/SessionAnswer";

/**
 * One read the mock recorded, and the controls a test answers it with while
 * reads are held.
 *
 * @example
 * ```ts
 * mock.reads[0]?.settle({ status: "signed-out" });
 * ```
 */
export type MockRead<TUser> = {
  context: ReadContext;
  /** Answers the held read: what the provider holds now unless told otherwise. */
  settle: (answer?: SessionAnswer<TUser>) => void;
  /** Rejects the held read with the error. */
  fail: (error: unknown) => void;
};
