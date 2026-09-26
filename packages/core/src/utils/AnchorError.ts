import type { AnchorErrorCode } from "src/types/AnchorErrorCode";

/**
 * An error Anchor or an adapter created, with a `code` to branch on. What a
 * provider SDK threw is its `cause`, and never reaches diagnostics.
 *
 * @example
 * ```ts
 * try {
 *   await session.getToken("api");
 * } catch (error) {
 *   if (error instanceof AnchorError && error.code === "SESSION_CHANGED") return;
 *
 *   throw error;
 * }
 * ```
 */
export class AnchorError extends Error {
  code: AnchorErrorCode;

  constructor({
    code,
    message,
    cause,
  }: {
    code: AnchorErrorCode;
    message: string;
    cause?: unknown;
  }) {
    // `{ cause: undefined }` would still give the error a `cause` of its own.
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AnchorError";
    this.code = code;
  }
}
