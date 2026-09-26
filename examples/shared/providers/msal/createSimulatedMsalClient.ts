import type { MsalAccountLike, MsalLike } from "@priemskiyyy/anchor-msal";

import {
  MSAL_AUTHORITY_ORIGIN,
  MSAL_ENVIRONMENT,
  MSAL_ID,
  MSAL_OBJECT_IDS,
  MSAL_TENANTS,
  MSAL_TOKEN_PREFIX,
} from "example-shared/providers/msal/constants/msal";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type EventType =
  | Parameters<MsalLike["addEventCallback"]>[1][number]
  | "msal:acquireTokenStart"
  | "msal:acquireTokenFailure";

type Registration = { callback: () => void; eventTypes: string[] };

type PopupRequest = { loginHint: string; authority: string; scopes: string[] };

type SimulatedMsalClient = MsalLike & {
  initialize: () => Promise<void>;
  setActiveAccount: (account: MsalAccountLike | null) => void;
  loginPopup: (request: PopupRequest) => Promise<{ account: MsalAccountLike }>;
};

const createMsalError = (name: string, errorCode: string, message: string) =>
  Object.assign(new Error(`${errorCode}: ${message}`), { name, errorCode });

const getOrganization = (authority: string) =>
  ORGANIZATION_IDS.find(
    (organization) =>
      authority === `${MSAL_AUTHORITY_ORIGIN}${MSAL_TENANTS[organization]}`,
  ) ?? null;

// Modelled on @azure/msal-browser 5.22.0, as the adapter's own fake: every event reaches the callbacks registered for its type synchronously, getActiveAccount throws until initialize() loaded the localStorage cache and then answers a copy of the account setActiveAccount chose, a login caches its account and emits loginSuccess, setActiveAccount emits activeAccountChanged in every tab, acquireTokenSilent answers from the cache unless forced and emits acquireTokenSuccess or acquireTokenFailure, and clearCache({ account }) removes that account alone. The cache lives in localStorage, which every tab shares.
export const createSimulatedMsalClient = (world: LabWorld) => {
  const registrations = new Map<string, Registration>();
  const accounts = new Map<string, MsalAccountLike>();
  const tokens = new Map<string, string>();
  let ready = false;
  let registered = 0;
  let active: string | null = null;

  const emit = (eventType: EventType) => {
    for (const { callback, eventTypes } of [...registrations.values()]) {
      if (!eventTypes.includes(eventType)) {
        continue;
      }

      callback();
    }
  };

  // The account MSAL caches for a sign-in: the person's home account, in the tenant of the session's organization.
  const cacheAccount = (session: ServerSession) => {
    const objectId = MSAL_OBJECT_IDS[session.person];
    const home = MSAL_TENANTS[PEOPLE[session.person].organization];

    const account: MsalAccountLike = {
      homeAccountId: `${objectId}.${home}`,
      environment: MSAL_ENVIRONMENT,
      tenantId:
        MSAL_TENANTS[
          session.organization ?? PEOPLE[session.person].organization
        ],
      localAccountId: objectId,
      username: PEOPLE[session.person].email,
      name: world.getName(session.person),
      idTokenClaims: { sid: session.id },
    };

    accounts.set(session.id, account);

    return { ...account };
  };

  const getSessionOf = (account: MsalAccountLike) => {
    const sid = account.idTokenClaims?.sid;

    return sid === undefined ? null : world.getSession(sid);
  };

  const holdAccount = (session: ServerSession | null) => {
    active = session === null ? null : session.id;
    world.holdSession(MSAL_ID, session);
  };

  const client: SimulatedMsalClient = {
    initialize: async () => {
      world.countCall();
      await world.waitForStorage();

      const held = world.getHeldSession(MSAL_ID);

      if (held !== null) {
        cacheAccount(held);
        active = held.id;
      }

      ready = true;
      emit("msal:initializeEnd");
    },
    getActiveAccount: () => {
      world.countCall();

      if (!ready) {
        throw createMsalError(
          "BrowserAuthError",
          "uninitialized_public_client_application",
          "You must call and await the initialize function before attempting to call any other MSAL API.",
        );
      }

      const account = active === null ? undefined : accounts.get(active);

      return account === undefined ? null : { ...account };
    },
    setActiveAccount: (account) => {
      world.countCall();
      holdAccount(account === null ? null : getSessionOf(account));
      emit("msal:activeAccountChanged");
    },
    addEventCallback: (callback, eventTypes) => {
      registered += 1;

      const callbackId = `callback-${registered}`;

      registrations.set(callbackId, { callback, eventTypes: [...eventTypes] });

      return callbackId;
    },
    removeEventCallback: (callbackId) => {
      registrations.delete(callbackId);
    },
    acquireTokenSilent: async ({ account, forceRefresh }) => {
      world.countCall();
      emit("msal:acquireTokenStart");

      const session = getSessionOf(account);
      const cached = session === null ? undefined : tokens.get(session.id);

      if (cached !== undefined && !forceRefresh) {
        emit("msal:acquireTokenSuccess");

        return { accessToken: cached, tokenType: "Bearer" };
      }

      try {
        await (forceRefresh ? world.waitForRefresh() : world.waitForServer());
      } catch (error) {
        emit("msal:acquireTokenFailure");

        throw error;
      }

      const latest = session === null ? null : world.getSession(session.id);

      // Microsoft Entra refuses the refresh token of a session it ended, and MSAL has nothing left to try silently.
      if (latest === null || latest.ended || !accounts.has(latest.id)) {
        emit("msal:acquireTokenFailure");

        throw createMsalError(
          "InteractionRequiredAuthError",
          "invalid_grant",
          "AADSTS50173: The provided grant has expired due to it being revoked.",
        );
      }

      const accessToken = world.issueToken(latest, MSAL_TOKEN_PREFIX);

      tokens.set(latest.id, accessToken);
      emit("msal:acquireTokenSuccess");

      return { accessToken, tokenType: "Bearer" };
    },
    clearCache: async ({ account }) => {
      world.countCall();
      await world.waitForStorage();

      const current = active === null ? undefined : accounts.get(active);

      if (current?.homeAccountId === account.homeAccountId) {
        holdAccount(null);
        emit("msal:activeAccountChanged");
      }

      for (const [id, cached] of [...accounts]) {
        if (cached.homeAccountId !== account.homeAccountId) {
          continue;
        }

        accounts.delete(id);
        tokens.delete(id);
      }
    },
    loginPopup: async ({ loginHint, authority }) => {
      world.countCall();
      await world.waitForServer();

      const person = getPersonByEmail(loginHint);

      if (person === null) {
        throw createMsalError(
          "ServerError",
          "invalid_request",
          "AADSTS50034: The user account does not exist in this directory.",
        );
      }

      const account = cacheAccount(
        world.openSession({
          provider: MSAL_ID,
          person,
          organization:
            getOrganization(authority) ?? PEOPLE[person].organization,
        }),
      );

      emit("msal:loginSuccess");

      return { account };
    },
  };

  return {
    client,
    // Harbor renames the person through Microsoft Graph, and the token acquisition after it refreshes the account's ID token.
    updateProfile: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      const session = active === null ? null : world.getSession(active);

      if (session === null) {
        return;
      }

      world.setName(session.person, name);
      cacheAccount(session);
      emit("msal:acquireTokenSuccess");
    },
    // Another tab signs the other person in on the shared cache, and MSAL broadcasts the active account to this one.
    signInElsewhere: () => {
      const current = active === null ? null : world.getSession(active);
      const person = current === null ? "ada" : OTHER_PEOPLE[current.person];

      const session = world.openSession({
        provider: MSAL_ID,
        person,
        organization: PEOPLE[person].organization,
      });

      cacheAccount(session);
      holdAccount(session);
      emit("msal:activeAccountChanged");
    },
    sendDuplicateEvent: () => {
      emit("msal:acquireTokenSuccess");
    },
  };
};
