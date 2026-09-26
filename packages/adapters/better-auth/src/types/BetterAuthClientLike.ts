import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";

/**
 * The parts of a Better Auth client the adapter uses, the same on
 * `better-auth/client`, `/react`, `/vue`, `/svelte` and `/solid`, and on React
 * Native with the Expo plugin. Pass the client `createAuthClient()` returned,
 * with its plugins; the adapter never creates it and never signs anyone in.
 *
 * @example
 * ```ts
 * const sdk: BetterAuthClientLike = createAuthClient({ baseURL });
 * ```
 */
export type BetterAuthClientLike = {
  // Better Auth types its atoms as a record of any atom, so the session atom is optional here.
  $store: { atoms: { session?: BetterAuthSessionAtomLike } };
  signOut: () => Promise<{ error: unknown }>;
};
