import type { AnchorDevtoolsOptions } from "src/types/AnchorDevtoolsOptions";

/**
 * Props of each framework wrapper: the inspector's options without `anchor`,
 * which the wrapper reads from its binding's provider.
 *
 * @example
 * ```ts
 * const props: AnchorDevtoolsProps = { initialIsOpen: true, maxEvents: 500 };
 * ```
 */
export type AnchorDevtoolsProps = Omit<AnchorDevtoolsOptions, "anchor">;
