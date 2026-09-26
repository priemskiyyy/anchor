import type { RegisteredAnchor } from "../types/Register.js";
import { useProvidedAnchorValue } from "./internal/useProvidedAnchorValue.js";

/**
 * Returns the nearest provider's Anchor, starting and reading nothing, and
 * throws when there is no provider. Augment `Register` to type it.
 *
 * @example
 * ```ts
 * const anchor = useAnchor();
 *
 * const handleLinkClick = async () => {
 *   await linkWithPopup(anchor.native.currentUser, provider);
 *   await anchor.sync();
 * };
 * ```
 */
export const useAnchor = (): RegisteredAnchor =>
  useProvidedAnchorValue().current;
