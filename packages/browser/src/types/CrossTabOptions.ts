/**
 * Options of `crossTab()`: the name that pairs the tabs of one application,
 * so two applications on one origin never wake each other.
 *
 * @example
 * ```ts
 * const options: CrossTabOptions = { name: "dashboard" };
 * ```
 */
export type CrossTabOptions = {
  name: string;
};
