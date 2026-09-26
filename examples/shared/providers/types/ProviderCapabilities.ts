/** What a provider's adapter can do, which decides what the lab enables and says. */
export type ProviderCapabilities = {
  /** Whether the SDK tells Anchor about a change, or Anchor learns it on its next read. */
  observation: "push" | "read";
  /** What Harbor sends its API: a token the provider mints, or the session cookie. */
  credential: "id-token" | "access-token" | "session-token" | "cookie";
  /** Whether a session names an organization, so switching it is another security context. */
  organizations: boolean;
  /** What a sign-out proves, in plain words. */
  ending: string;
  /** Whether a sign-out hands back the provider's logout page. */
  navigation: boolean;
  /** Whether a start without network is `unavailable`, or restores from the SDK's own storage. */
  offlineStart: "unavailable" | "restores";
  /** How Harbor tries again after a failed start: another read, or reloading the page. */
  retry: "sync" | "reload";
};
