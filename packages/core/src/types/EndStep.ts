/**
 * What ending a session proved for one side: the step `completed`, did not
 * apply, or its outcome is `unknown`.
 *
 * @example
 * ```ts
 * const remote: EndStep = result.remote;
 * ```
 */
export type EndStep = "completed" | "not-applicable" | "unknown";
