/**
 * The default user of an MSAL session: a plain snapshot of the active
 * account's fields, under MSAL's names, with `null` for a field it lacks.
 *
 * @example
 * ```ts
 * const username = state.status === "signed-in" ? state.session.user.username : null;
 * ```
 */
export type MsalSessionUser = {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name: string | null;
};
