import type { Snippet } from "svelte";
import type { RegisteredAnchor } from "./Register.js";

/**
 * The props of `AnchorProvider`: the Anchor it publishes and the content that
 * reads it.
 *
 * @example
 * ```ts
 * const props: AnchorProviderProps = { anchor };
 * ```
 */
export type AnchorProviderProps = {
  anchor: RegisteredAnchor;
  children?: Snippet | undefined;
};
