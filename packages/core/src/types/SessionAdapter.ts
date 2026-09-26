import type { AdapterSession } from "src/types/AdapterSession";
import type { SessionObserver } from "src/types/SessionObserver";

/**
 * A cold description of one provider SDK the application set up. `open`
 * installs the provider's listeners synchronously and returns the session; the
 * core calls it once per start and never branches on `name`.
 *
 * @example
 * ```ts
 * const adapter: SessionAdapter<User, typeof sdk, never> = {
 *   name: "example",
 *   native: sdk,
 *   tokens: {},
 *   open: (observer) => ({ read: async () => getAnswer(await sdk.getUser()) }),
 * };
 * ```
 */
export type SessionAdapter<
  TUser = unknown,
  TNative = unknown,
  TProfile extends string = never,
> = {
  name: string;
  /** The application's own SDK, published as `anchor.native`. */
  native: TNative;
  /** The token profiles the adapter mints, by name; the core reads only the names. */
  tokens: Partial<Record<TProfile, unknown>>;
  open: (observer: SessionObserver<TUser>) => AdapterSession<TUser, TProfile>;
};
