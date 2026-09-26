import { MSAL_ID } from "example-shared/providers/msal/constants/msal";
import { createMsalProvider } from "example-shared/providers/msal/createMsalProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** MSAL: its events ask Anchor to read once `initialized` settles, it mints access tokens per tenant, and ending clears only the account, with no logout page. */
export const MSAL_PROVIDER: LabProvider = {
  id: MSAL_ID,
  label: "MSAL",
  name: "MSAL",
  icon: { monogram: "Ms", tone: "accent" },
  sdk: "@azure/msal-browser 5.22.0, the PublicClientApplication",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: true,
    ending:
      "local completed and remote unknown, with no logout page: MSAL clears only this account from its cache, and the Microsoft Entra session survives until the browser signs it out",
    navigation: false,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "MSAL shares its localStorage cache across tabs and broadcast the other tab's active account: Anchor read again and accepted the other person under a new key.",
    },
    "server-end": {
      available: true,
      outcome:
        "MSAL keeps its cached tokens, so nothing changed here. Load slowly asks for a fresh token, and Microsoft Entra refuses the refresh: MSAL answers that the person must sign in again, and still nobody is signed out.",
    },
    offline: {
      available: true,
      outcome:
        "MSAL keeps the account in its localStorage cache, so Anchor stays signed in and a reload restores it offline. A fresh token or Harbor's API now fails, and still nobody is signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Initializing, signing in and refreshing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "A token acquisition raised msal:acquireTokenSuccess, and Anchor read the same account again. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "The MSAL adapter's read waits for initialize() and then reads the active account, so it never answers an older one.",
    },
    "two-factor": {
      available: false,
      reason:
        "Microsoft Entra asks for a second factor during its own sign-in, before MSAL caches an account: the adapter reports no pending step.",
    },
    "partial-end": {
      available: false,
      reason:
        "An MSAL sign-out always clears only this account and leaves the Microsoft Entra session: every ending is already local completed, remote unknown.",
    },
  },
  create: createMsalProvider,
};
