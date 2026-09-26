import type { EndStep } from "src/types/EndStep";

/**
 * What `session.end()` proved: whether this application's local session and
 * the provider's remote one ended, and a page to open when the provider needs
 * a visit to finish.
 *
 * @example
 * ```ts
 * const result = await session.end();
 *
 * if (result.navigation !== null) window.location.assign(result.navigation.url);
 * ```
 */
export type EndResult = {
  local: EndStep;
  remote: EndStep;
  /** A page the application must open to finish, such as Auth0's logout endpoint, or `null`. */
  navigation: { url: string } | null;
};
