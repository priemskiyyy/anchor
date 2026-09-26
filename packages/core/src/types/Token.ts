/**
 * A credential minted for one session. Anchor hands it over and keeps nothing,
 * never logs it, and never assumes it is a JWT or a bearer token.
 *
 * @example
 * ```ts
 * const token = await session.getToken("api");
 * const authorization = `${token.scheme ?? "Bearer"} ${token.value}`;
 * ```
 */
export type Token = {
  value: string;
  kind: "access-token" | "id-token" | "session-token" | (string & {});
  /** The authorization scheme the provider names, such as `Bearer` or `DPoP`, or `null` when it names none. */
  scheme: string | null;
};
