import { useProvidedAnchorAccessor } from "src/primitives/internal/useProvidedAnchorAccessor";
import type { RegisteredAnchor } from "src/types/Register";

/**
 * Returns the nearest provider's Anchor, starting and reading nothing, and
 * throws when there is no provider. Augment `Register` to type it.
 *
 * @example
 * ```tsx
 * const anchor = useAnchor();
 *
 * const handleLinkClick = async () => {
 *   await linkWithPopup(anchor.native.currentUser, provider);
 *   await anchor.sync();
 * };
 * ```
 */
export const useAnchor = (): RegisteredAnchor => useProvidedAnchorAccessor()();
