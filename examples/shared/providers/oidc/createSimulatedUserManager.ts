import {
  OIDC_CLIENT_ID,
  OIDC_END_SESSION_ENDPOINT,
  OIDC_ID,
  OIDC_ISSUER,
  OIDC_ORGANIZATIONS,
  OIDC_SUBJECTS,
  OIDC_TOKEN_PREFIX,
} from "example-shared/providers/oidc/constants/oidc";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { PEOPLE } from "example-shared/world/constants/people";
import {
  HARBOR_ORIGIN,
  NETWORK_FAILURE,
} from "example-shared/world/constants/world";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type OidcProfile = {
  iss: string;
  sub: string;
  sid: string;
  org_id?: string;
  name: string;
  preferred_username: string;
  email: string;
  email_verified: boolean;
};

type OidcUser = {
  access_token: string;
  token_type: string;
  id_token: string;
  expired: boolean;
  profile: OidcProfile;
};

type UserLoadedCallback = (user: OidcUser) => Promise<void> | void;

type UserCallback = () => Promise<void> | void;

type StoredUser = { server: ServerSession; user: OidcUser };

type SigninOptions = {
  login_hint: string;
  extraQueryParams?: { organization?: string };
};

const addCallback = <TCallback>(
  callbacks: TCallback[],
  callback: TCallback,
) => {
  callbacks.push(callback);

  return () => {
    const index = callbacks.lastIndexOf(callback);

    if (index < 0) {
      return;
    }

    callbacks.splice(index, 1);
  };
};

const copyUser = (user: OidcUser): OidcUser => ({
  ...user,
  profile: { ...user.profile },
});

const createLoginRequiredError = () =>
  Object.assign(new Error("login_required"), { error: "login_required" });

const getOrganization = (claim: string | undefined) =>
  ORGANIZATION_IDS.find(
    (organization) => OIDC_ORGANIZATIONS[organization] === claim,
  ) ?? null;

// Modelled on oidc-client-ts 3.5.0, as the adapter's own fake: every add* call answers its remover, raising an event awaits each callback in turn, getUser answers a copy of the user in this tab's sessionStorage, signinSilent stores the renewed user and raises userLoaded, removeUser raises userUnloaded, and the metadata service answers the end-session endpoint.
export const createSimulatedUserManager = (world: LabWorld) => {
  const loaded: UserLoadedCallback[] = [];
  const unloaded: UserCallback[] = [];
  const signedOut: UserCallback[] = [];
  const armed = { metadataFailure: false, staleRead: false };
  let stored: StoredUser | null = null;

  const createUser = (server: ServerSession): OidcUser => ({
    access_token: world.issueToken(server, OIDC_TOKEN_PREFIX),
    token_type: "Bearer",
    id_token: `oidc-id-token.${server.id}`,
    expired: false,
    profile: {
      iss: OIDC_ISSUER,
      sub: OIDC_SUBJECTS[server.person],
      sid: server.id,
      ...(server.organization === null
        ? {}
        : { org_id: OIDC_ORGANIZATIONS[server.organization] }),
      name: world.getName(server.person),
      preferred_username: server.person,
      email: PEOPLE[server.person].email,
      email_verified: true,
    },
  });

  const raiseUserLoaded = async (user: OidcUser) => {
    for (const callback of loaded) {
      await callback(copyUser(user));
    }
  };

  const raise = async (callbacks: UserCallback[]) => {
    for (const callback of callbacks) {
      await callback();
    }
  };

  const restoring = world.waitForStorage().then(() => {
    const server = world.getHeldSession(OIDC_ID);

    stored = server === null ? null : { server, user: createUser(server) };
  });

  const getStoredUser = async () => {
    await restoring;

    // A user store without a lock can answer the user it found before a sign-in landed.
    if (armed.staleRead) {
      armed.staleRead = false;

      const found = stored;

      await world.waitForSlowStorage();

      return found === null ? null : copyUser(found.user);
    }

    await world.waitForStorage();

    return stored === null ? null : copyUser(stored.user);
  };

  const manager = {
    events: {
      addUserLoaded: (callback: UserLoadedCallback) => {
        world.countCall();

        return addCallback(loaded, callback);
      },
      addUserUnloaded: (callback: UserCallback) => {
        world.countCall();

        return addCallback(unloaded, callback);
      },
      addUserSignedOut: (callback: UserCallback) => {
        world.countCall();

        return addCallback(signedOut, callback);
      },
    },
    settings: {
      client_id: OIDC_CLIENT_ID,
      post_logout_redirect_uri: HARBOR_ORIGIN,
      extraQueryParams: {},
    },
    metadataService: {
      getEndSessionEndpoint: async () => {
        world.countCall();

        if (armed.metadataFailure) {
          armed.metadataFailure = false;

          throw new TypeError(NETWORK_FAILURE);
        }

        await world.waitForServer();

        return OIDC_END_SESSION_ENDPOINT;
      },
    },
    getUser: () => {
      world.countCall();

      return getStoredUser();
    },
    signinSilent: async () => {
      world.countCall();

      const renewing = stored;

      if (renewing === null) {
        throw createLoginRequiredError();
      }

      await world.waitForRefresh();

      const latest = world.getSession(renewing.server.id);

      if (latest === null || latest.ended) {
        throw createLoginRequiredError();
      }

      const user = createUser(latest);

      // A renewal lands only while the user it renewed is still the stored one.
      if (stored === renewing) {
        stored = { server: latest, user };
        await raiseUserLoaded(user);
      }

      return copyUser(user);
    },
    removeUser: async () => {
      world.countCall();
      world.holdSession(OIDC_ID, null);
      stored = null;
      await raise(unloaded);
    },
    signinPopup: async ({ login_hint, extraQueryParams }: SigninOptions) => {
      world.countCall();
      await world.waitForServer();

      const person = getPersonByEmail(login_hint);

      if (person === null) {
        throw Object.assign(new Error("access_denied"), {
          error: "access_denied",
        });
      }

      const organization =
        getOrganization(extraQueryParams?.organization) ??
        PEOPLE[person].organization;

      // The provider keeps its login session when the same person picks another organization.
      const server =
        stored !== null && stored.server.person === person
          ? (world.updateSession(stored.server.id, { organization }) ??
            stored.server)
          : world.openSession({ provider: OIDC_ID, person, organization });

      const user = createUser(server);

      world.holdSession(OIDC_ID, server);
      stored = { server, user };
      await raiseUserLoaded(user);
    },
  };

  return {
    manager,
    getStoredPerson: () => (stored === null ? null : stored.server.person),
    armStaleRead: () => {
      armed.staleRead = true;
    },
    armMetadataFailure: () => {
      armed.metadataFailure = true;
    },
    // The provider's account page renames the user, and the silent renewal after it carries the name.
    updateProfile: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      if (stored === null) {
        return;
      }

      world.setName(stored.server.person, name);
      stored = {
        server: stored.server,
        user: { ...stored.user, profile: { ...stored.user.profile, name } },
      };
      await raiseUserLoaded(stored.user);
    },
    sendDuplicateEvent: async () => {
      if (stored === null) {
        return;
      }

      await raiseUserLoaded(stored.user);
    },
  };
};
