import type { KeycloakLike } from "@priemskiyyy/anchor-keycloak";

import {
  FORCED_REFRESH,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_ID,
  KEYCLOAK_ISSUER,
  KEYCLOAK_LOGOUT_ENDPOINT,
  KEYCLOAK_ORGANIZATIONS,
  KEYCLOAK_SUBJECTS,
  KEYCLOAK_TOKEN_PREFIX,
  ORGANIZATION_SCOPE,
} from "example-shared/providers/keycloak/constants/keycloak";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { PEOPLE } from "example-shared/world/constants/people";
import { HARBOR_ORIGIN } from "example-shared/world/constants/world";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type LoginOptions = { loginHint: string; scope?: string };

type SimulatedKeycloak = KeycloakLike & {
  idToken?: string | undefined;
  init: () => Promise<boolean>;
  login: (options: LoginOptions) => Promise<void>;
};

const getOrganization = (scope: string | undefined) =>
  ORGANIZATION_IDS.find(
    (organization) =>
      scope === `${ORGANIZATION_SCOPE}${KEYCLOAK_ORGANIZATIONS[organization]}`,
  ) ?? null;

// Modelled on keycloak-js 26.2.4, as the adapter's own fake: every callback is a single property called as a method of the instance, init() runs once and calls onReady when it finished, updateToken refreshes when forced with -1, a refresh Keycloak refuses with a 400 clears the tokens and calls onAuthLogout before it rejects, and clearToken calls onAuthLogout while a token is held. The tokens live in this tab's memory.
export const createSimulatedKeycloak = (world: LabWorld) => {
  const armed = { logoutUrlFailure: false };
  let held: ServerSession | null = null;

  const setTokens = (server: ServerSession | null) => {
    held = server;
    world.holdSession(KEYCLOAK_ID, server);

    if (server === null) {
      instance.token = undefined;
      instance.tokenParsed = undefined;
      instance.refreshToken = undefined;
      instance.idToken = undefined;

      return;
    }

    instance.token = world.issueToken(server, KEYCLOAK_TOKEN_PREFIX);
    instance.idToken = `keycloak-id-token.${server.id}`;
    instance.refreshToken = `keycloak-refresh-token.${server.id}`;
    instance.tokenParsed = {
      iss: KEYCLOAK_ISSUER,
      sub: KEYCLOAK_SUBJECTS[server.person],
      sid: server.id,
      ...(server.organization === null
        ? {}
        : { organization: [KEYCLOAK_ORGANIZATIONS[server.organization]] }),
      name: world.getName(server.person),
      preferred_username: server.person,
      email: PEOPLE[server.person].email,
      email_verified: true,
    };
  };

  // Keycloak keeps its login session when the same person asks for another organization.
  const getLoginSession = (person: PersonId, organization: OrganizationId) => {
    if (held === null || held.person !== person) {
      return world.openSession({ provider: KEYCLOAK_ID, person, organization });
    }

    return world.updateSession(held.id, { organization }) ?? held;
  };

  const instance: SimulatedKeycloak = {
    didInitialize: false,
    init: async () => {
      world.countCall();
      instance.didInitialize = true;
      await world.waitForServer();

      const server = world.getHeldSession(KEYCLOAK_ID);
      const authenticated = server !== null && !server.ended;

      if (authenticated) {
        setTokens(server);
        instance.onAuthSuccess?.();
      }

      instance.onReady?.(authenticated);

      return authenticated;
    },
    updateToken: async (minValidity) => {
      world.countCall();

      const refreshing = held;

      if (instance.refreshToken === undefined || refreshing === null) {
        throw new Error("Unable to update token, no refresh token available.");
      }

      // The lab's tokens never near their expiry, so only a forced refresh reaches Keycloak.
      if (minValidity !== FORCED_REFRESH) {
        return false;
      }

      await world.waitForRefresh();

      // A login during the refresh replaced the tokens, so the refresh no longer applies.
      if (held !== refreshing) {
        return true;
      }

      const latest = world.getSession(refreshing.id);

      if (latest === null || latest.ended) {
        instance.clearToken();

        throw Object.assign(
          new Error("Server responded with an invalid status."),
          {
            response: { status: 400 },
          },
        );
      }

      setTokens(latest);
      instance.onAuthRefreshSuccess?.();

      return true;
    },
    createLogoutUrl: () => {
      world.countCall();

      if (armed.logoutUrlFailure) {
        armed.logoutUrlFailure = false;

        throw new Error("Not supported by the OIDC server");
      }

      return `${KEYCLOAK_LOGOUT_ENDPOINT}?client_id=${KEYCLOAK_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(HARBOR_ORIGIN)}&id_token_hint=${encodeURIComponent(instance.idToken ?? "")}`;
    },
    clearToken: () => {
      world.countCall();

      if (instance.token === undefined) {
        return;
      }

      setTokens(null);
      instance.onAuthLogout?.();
    },
    login: async ({ loginHint, scope }) => {
      world.countCall();
      await world.waitForServer();

      const person = getPersonByEmail(loginHint);

      if (person === null) {
        throw new Error("Invalid username or password.");
      }

      setTokens(
        getLoginSession(
          person,
          getOrganization(scope) ?? PEOPLE[person].organization,
        ),
      );
      instance.onAuthSuccess?.();
    },
  };

  return {
    instance,
    getHeldPerson: () => (held === null ? null : held.person),
    // The account console renames the user, and the refresh after it carries the name.
    updateProfile: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      if (held === null) {
        return;
      }

      world.setName(held.person, name);
      setTokens(held);
      instance.onAuthRefreshSuccess?.();
    },
    armLogoutUrlFailure: () => {
      armed.logoutUrlFailure = true;
    },
    sendDuplicateEvent: () => {
      instance.onAuthRefreshSuccess?.();
    },
  };
};
