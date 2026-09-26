/** What a request to Harbor's API carries: a token the provider minted, or the session cookie. */
export type HarborCredential =
  | { kind: "token"; value: string }
  | { kind: "cookie"; provider: { id: string } };
