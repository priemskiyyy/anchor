import type { SessionIdentity } from "src/types/SessionIdentity";

/**
 * One token acquisition the core asks an adapter for: the declared profile,
 * whether to skip the provider's cache, the session it must be minted for, and
 * a signal that aborts once no caller waits any more.
 *
 * @example
 * ```ts
 * const getToken = async ({ profile, forceRefresh, session }: TokenRequest<"api">) =>
 *   mint(profile, { forceRefresh, subject: session.principal.subject });
 * ```
 */
export type TokenRequest<TProfile extends string> = {
  profile: TProfile;
  forceRefresh: boolean;
  session: SessionIdentity;
  signal: AbortSignal;
};
