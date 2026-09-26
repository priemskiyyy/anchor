import type { Token } from "src/types/Token";
import type { TokenRequest } from "src/types/TokenRequest";

/**
 * One token request the mock recorded, and the controls a test answers it with
 * while token requests are held.
 *
 * @example
 * ```ts
 * mock.tokens[0]?.settle({ value: "eyJ.access", kind: "access-token", scheme: "Bearer" });
 * ```
 */
export type MockTokenCall<TProfile extends string> = {
  request: TokenRequest<TProfile>;
  /** Answers the held request: a token named after the profile and the request's subject unless told otherwise, and `SESSION_CHANGED` when the provider holds another session by then. */
  settle: (token?: Token) => void;
  /** Rejects the held request with the error. */
  fail: (error: unknown) => void;
};
