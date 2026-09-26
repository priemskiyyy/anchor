import type { MsalAccountLike } from "src/types/MsalAccountLike";
import type { MsalLike } from "src/types/MsalLike";

type EventType =
  | Parameters<MsalLike["addEventCallback"]>[1][number]
  | "msal:initializeStart"
  | "msal:acquireTokenStart"
  | "msal:acquireTokenFailure"
  | "msal:logoutSuccess";

type SilentRequest = Parameters<MsalLike["acquireTokenSilent"]>[0];

type FakeAccount = { tenantId?: string; sid?: string | null; name?: string };

type FakePublicClientApplication = MsalLike & {
  initialize: () => Promise<void>;
  setActiveAccount: (account: MsalAccountLike | null) => void;
  getAllAccounts: () => MsalAccountLike[];
};

export const MSAL_ENVIRONMENT = "login.windows.net";

export const MSAL_TENANT = "8f0b5f2e-6c7d-4d0f-9e33-5b6a2f6c1a11";

export const OTHER_TENANT = "2d6e8a41-7b3c-4f5e-a1d2-c3b4a5968778";

const createUninitializedError = () =>
  Object.assign(
    new Error(
      "uninitialized_public_client_application: You must call and await the initialize function before attempting to call any other MSAL API.",
    ),
    {
      name: "BrowserAuthError",
      errorCode: "uninitialized_public_client_application",
    },
  );

const createNoTokensError = () =>
  Object.assign(new Error("no_tokens_found: No refresh token found."), {
    name: "InteractionRequiredAuthError",
    errorCode: "no_tokens_found",
  });

// Modelled on @azure/msal-browser 5.22.0: addEventCallback registers under a new id and answers null outside a browser, every event reaches the callbacks registered for its type synchronously in registration order, getActiveAccount answers a fresh copy of the tenant profile setActiveAccount chose and throws uninitialized_public_client_application until initialize() loaded a localStorage cache, setActiveAccount emits activeAccountChanged, a login caches its account and emits loginSuccess, acquireTokenSilent emits acquireTokenStart, then acquireTokenSuccess with a token for the account it is given, from the cache unless forced, or acquireTokenFailure, and clearCache({ account }) clears the active account with an activeAccountChanged when it was that account, then removes every tenant profile of the account and its tokens.
export const createFakePublicClientApplication = ({
  initialized = true,
  browser = true,
}: { initialized?: boolean; browser?: boolean } = {}) => {
  const registrations = new Map<
    string,
    { callback: () => void; eventTypes: string[] }
  >();

  const removals: string[] = [];
  const silentRequests: SilentRequest[] = [];
  const clearedAccounts: MsalAccountLike[] = [];
  const failures: { token: unknown } = { token: null };
  const cachedTokens = new Map<string, string>();
  let ready = initialized;
  let issued = 0;
  let registered = 0;
  let sessions = 0;
  let accounts: MsalAccountLike[] = [];
  let active: { homeAccountId: string; tenantId: string } | null = null;

  const emit = (eventType: EventType) => {
    for (const { callback, eventTypes } of [...registrations.values()]) {
      if (eventTypes.length > 0 && !eventTypes.includes(eventType)) {
        continue;
      }

      callback();
    }
  };

  const isAccount = (
    account: MsalAccountLike,
    { homeAccountId, tenantId }: { homeAccountId: string; tenantId: string },
  ) => account.homeAccountId === homeAccountId && account.tenantId === tenantId;

  const cacheAccount = (
    homeAccountId: string,
    { tenantId = MSAL_TENANT, sid, name }: FakeAccount = {},
  ) => {
    sessions += 1;

    const account: MsalAccountLike = {
      homeAccountId,
      environment: MSAL_ENVIRONMENT,
      tenantId,
      localAccountId: `local.${homeAccountId}`,
      username: `${homeAccountId}@contoso.example`,
      name: name ?? homeAccountId.toUpperCase(),
      ...(sid === null
        ? {}
        : { idTokenClaims: { sid: sid ?? `sid_${sessions}` } }),
    };

    accounts = [
      ...accounts.filter((cached) => !isAccount(cached, account)),
      account,
    ];

    return { ...account };
  };

  const sdk: FakePublicClientApplication = {
    initialize: async () => {
      if (ready) {
        return;
      }

      emit("msal:initializeStart");
      await Promise.resolve();
      ready = true;
      emit("msal:initializeEnd");
    },
    getActiveAccount: () => {
      if (!ready) {
        throw createUninitializedError();
      }

      const account = accounts.find(
        (cached) => active !== null && isAccount(cached, active),
      );

      return account === undefined ? null : { ...account };
    },
    getAllAccounts: () => accounts.map((account) => ({ ...account })),
    setActiveAccount: (account) => {
      active =
        account === null
          ? null
          : {
              homeAccountId: account.homeAccountId,
              tenantId: account.tenantId,
            };
      emit("msal:activeAccountChanged");
    },
    addEventCallback: (callback, eventTypes) => {
      if (!browser) {
        return null;
      }

      registered += 1;

      const callbackId = `callback-${registered}`;

      registrations.set(callbackId, { callback, eventTypes: [...eventTypes] });

      return callbackId;
    },
    removeEventCallback: (callbackId) => {
      removals.push(callbackId);
      registrations.delete(callbackId);
    },
    acquireTokenSilent: async (request) => {
      silentRequests.push(request);

      if (!ready) {
        throw createUninitializedError();
      }

      emit("msal:acquireTokenStart");

      const { account, scopes, forceRefresh } = request;

      if (failures.token !== null) {
        emit("msal:acquireTokenFailure");

        throw failures.token;
      }

      if (!accounts.some((cached) => isAccount(cached, account))) {
        emit("msal:acquireTokenFailure");

        throw createNoTokensError();
      }

      const key = `${account.homeAccountId}|${account.tenantId}|${scopes.join(" ")}`;
      const cached = cachedTokens.get(key);

      if (cached !== undefined && !forceRefresh) {
        emit("msal:acquireTokenSuccess");

        return { accessToken: cached, tokenType: "Bearer" };
      }

      issued += 1;

      const accessToken = `access.${account.homeAccountId}.${scopes.join(" ")}.${issued}`;

      cachedTokens.set(key, accessToken);
      emit("msal:acquireTokenSuccess");

      return { accessToken, tokenType: "Bearer" };
    },
    clearCache: async ({ account }) => {
      clearedAccounts.push(account);

      if (active !== null && active.homeAccountId === account.homeAccountId) {
        active = null;
        emit("msal:activeAccountChanged");
      }

      accounts = accounts.filter(
        (cached) =>
          cached.homeAccountId !== account.homeAccountId ||
          cached.environment !== account.environment,
      );

      for (const key of [...cachedTokens.keys()]) {
        if (!key.startsWith(`${account.homeAccountId}|`)) {
          continue;
        }

        cachedTokens.delete(key);
      }
    },
  };

  return {
    sdk,
    removals,
    silentRequests,
    clearedAccounts,
    failures,
    emit,
    listeners: () => registrations.size,
    login: (homeAccountId: string, options: FakeAccount = {}) => {
      const account = cacheAccount(homeAccountId, options);

      emit("msal:loginSuccess");

      return account;
    },
    signIn: (homeAccountId: string, options: FakeAccount = {}) => {
      const account = cacheAccount(homeAccountId, options);

      emit("msal:loginSuccess");
      sdk.setActiveAccount(account);

      return account;
    },
    switchSilently: (homeAccountId: string, options: FakeAccount = {}) => {
      const account = cacheAccount(homeAccountId, options);

      active = { homeAccountId, tenantId: account.tenantId };

      return account;
    },
  };
};
