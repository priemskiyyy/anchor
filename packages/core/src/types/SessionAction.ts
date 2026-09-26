/**
 * The step a provider requires before a session may be used, under the
 * provider's own name, such as Clerk's `choose-organization` or `setup-mfa`.
 *
 * @example
 * ```ts
 * const action: SessionAction = { kind: "choose-organization" };
 * ```
 */
export type SessionAction = { kind: string };
