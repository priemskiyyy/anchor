import type { MsalAccountLike } from "src/types/MsalAccountLike";

/**
 * The parts of an MSAL.js `PublicClientApplication` the adapter calls. Pass the
 * instance your application created; the adapter never calls `initialize()`,
 * never handles a redirect and never sets the active account.
 *
 * @example
 * ```ts
 * const sdk: MsalLike = new PublicClientApplication({ auth: { clientId } });
 * ```
 */
export type MsalLike = {
  getActiveAccount: () => MsalAccountLike | null;
  /** Registers a callback for the given MSAL events; answers its id, or `null` outside a browser, where MSAL registers nothing. */
  addEventCallback: (
    callback: () => void,
    eventTypes: (
      | "msal:initializeEnd"
      | "msal:activeAccountChanged"
      | "msal:loginSuccess"
      | "msal:acquireTokenSuccess"
    )[],
  ) => string | null;
  removeEventCallback: (callbackId: string) => void;
  acquireTokenSilent: (request: {
    scopes: string[];
    account: MsalAccountLike;
    forceRefresh: boolean;
  }) => Promise<{ accessToken: string; tokenType: string }>;
  /** Removes the account, its tokens and, when it is active, the active account from MSAL's cache, without navigating. */
  clearCache: (request: { account: MsalAccountLike }) => Promise<void>;
};
