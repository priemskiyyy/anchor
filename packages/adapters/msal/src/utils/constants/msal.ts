import type { MsalLike } from "src/types/MsalLike";

/** The adapter's name in diagnostics. */
export const MSAL_ADAPTER_NAME = "msal";

/** The MSAL events after which the active account may differ: MSAL loaded its cache, the active account was set or cleared here or in another tab, a login finished, or a token acquisition refreshed the account's ID token. */
export const SESSION_EVENT_TYPES = Object.freeze([
  "msal:initializeEnd",
  "msal:activeAccountChanged",
  "msal:loginSuccess",
  "msal:acquireTokenSuccess",
] satisfies Parameters<MsalLike["addEventCallback"]>[1]);

/** The name MSAL gives the error it throws when only the user can go on: signing in again, consenting or completing a second factor. */
export const INTERACTION_REQUIRED_ERROR_NAME = "InteractionRequiredAuthError";
