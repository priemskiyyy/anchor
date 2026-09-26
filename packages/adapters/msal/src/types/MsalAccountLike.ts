/**
 * The parts of an MSAL `AccountInfo` the adapter reads: the environment, home
 * account id and tenant that name the principal, the ID token's session that
 * fingerprints its context, and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const account: MsalAccountLike | null = msalInstance.getActiveAccount();
 * ```
 */
export type MsalAccountLike = {
  /** The cloud that issued the account, as MSAL caches it, such as `login.windows.net`. */
  environment: string;
  /** The account's id in its home tenant, which MSAL keys its cache by. */
  homeAccountId: string;
  /** The tenant this account profile is signed in to, or an empty string outside Microsoft Entra ID. */
  tenantId: string;
  localAccountId: string;
  username: string;
  name?: string;
  /** The ID token's claims, absent when MSAL holds no ID token for this tenant profile. */
  idTokenClaims?: { sid?: string };
};
