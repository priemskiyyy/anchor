import type { PropsWithChildren } from "react";

import { AnchorContext } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

/**
 * The props of `AnchorProvider`: the Anchor it publishes and the tree that
 * reads it.
 *
 * @example
 * ```tsx
 * const props: AnchorProviderProps = { anchor, children: <Application /> };
 * ```
 */
export type AnchorProviderProps = PropsWithChildren<{
  anchor: RegisteredAnchor;
}>;

/**
 * Publishes one Anchor to the tree below and does nothing else: whoever
 * constructed it starts and disposes it, so mounting starts nothing and
 * unmounting disposes nothing. Augment `Register` first, or TypeScript refuses
 * an Anchor typed by its own adapter.
 *
 * @example
 * ```tsx
 * export const anchor = new Anchor({ adapter: firebase({ sdk: auth, tokens: { api: idToken() } }) });
 *
 * declare module "@priemskiyyy/anchor-react" {
 *   interface Register {
 *     anchor: typeof anchor;
 *   }
 * }
 *
 * anchor.start();
 *
 * <AnchorProvider anchor={anchor}>
 *   <Application />
 * </AnchorProvider>
 * ```
 */
export const AnchorProvider = ({ anchor, children }: AnchorProviderProps) => (
  <AnchorContext.Provider value={anchor}>{children}</AnchorContext.Provider>
);
