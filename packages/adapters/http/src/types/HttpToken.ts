import type { Token } from "@priemskiyyy/anchor";

/**
 * What a token profile's function answers: the token, and the subject your
 * server minted it for, so a token minted for whoever is signed in now never
 * reaches another session's work.
 *
 * @example
 * ```ts
 * const token: HttpToken = { value: "eyJhbGciOi...", subject: "user_42", scheme: "Bearer" };
 * ```
 */
export type HttpToken = {
  value: string;
  /** Who your server minted the token for. */
  subject: string;
  /** The tenant your server minted the token in; when answered, a token for another tenant than the session's is refused. */
  tenant?: string | null | undefined;
  /** What `read` answers as the context the token was minted for, such as the active organization; when answered, a token for another context is refused. */
  context?: string | null | undefined;
  /** What the token is; `access-token` by default. */
  kind?: Token["kind"] | undefined;
  /** The authorization scheme to send it with, such as `Bearer`; none by default. */
  scheme?: string | null | undefined;
};
