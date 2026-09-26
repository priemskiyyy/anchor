/**
 * Who a session belongs to: the provider's stable subject within the authority
 * that issued it and, where the provider partitions users, the tenant. Never an
 * email address.
 *
 * @example
 * ```ts
 * const principal: Principal = {
 *   authority: "https://securetoken.google.com/my-project",
 *   subject: "uid_42",
 *   tenant: null,
 * };
 * ```
 */
export type Principal = {
  /** The issuer of the identity, which keeps two providers' or two projects' subjects apart. */
  authority: string;
  subject: string;
  /** The provider's tenant partition, such as an Identity Platform tenant, or `null`. */
  tenant: string | null;
};
