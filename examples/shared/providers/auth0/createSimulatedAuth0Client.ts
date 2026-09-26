import {
  AUTH0_CLIENT_ID,
  AUTH0_ID,
  AUTH0_ISSUER,
  AUTH0_ORGANIZATIONS,
  AUTH0_SUBJECTS,
  AUTH0_TOKEN_PREFIX,
} from "example-shared/providers/auth0/constants/auth0";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { HARBOR_ORIGIN } from "example-shared/world/constants/world";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type Auth0Claims = {
  iss: string;
  sub: string;
  sid: string;
  org_id?: string;
  name: string;
  nickname: string;
  picture: string;
  email: string;
  email_verified: boolean;
};

type TokenOptions = {
  authorizationParams: { audience?: string; scope?: string };
  cacheMode: "on" | "off";
  detailedResponse: true;
};

type LogoutOptions = {
  openUrl: (url: string) => void;
  logoutParams?: { returnTo?: string };
};

type PopupOptions = {
  authorizationParams: { login_hint: string; organization?: string };
};

const createLoginRequiredError = () =>
  Object.assign(new Error("Login required"), {
    error: "login_required",
    error_description: "Login required",
  });

const getOrganization = (auth0Organization: string | undefined) =>
  ORGANIZATION_IDS.find(
    (organization) => AUTH0_ORGANIZATIONS[organization] === auth0Organization,
  ) ?? null;

// Modelled on auth0-spa-js 2.27.0, as the adapter's own fake: it emits nothing, the ID token claims come from a cache every tab shares, getTokenSilently answers from that cache unless asked not to, and logout with openUrl clears the cache and hands over Auth0's logout page instead of opening it.
export const createSimulatedAuth0Client = (world: LabWorld) => {
  const tokens = new Map<string, string>();

  const getClaims = (session: ServerSession): Auth0Claims => ({
    iss: AUTH0_ISSUER,
    sub: AUTH0_SUBJECTS[session.person],
    sid: session.id,
    ...(session.organization === null
      ? {}
      : { org_id: AUTH0_ORGANIZATIONS[session.organization] }),
    name: world.getName(session.person),
    nickname: session.person,
    picture: `${HARBOR_ORIGIN}/avatars/${session.person}.png`,
    email: PEOPLE[session.person].email,
    email_verified: true,
  });

  const holdSession = (session: ServerSession) => {
    world.holdSession(AUTH0_ID, session);
    tokens.set(session.id, world.issueToken(session, AUTH0_TOKEN_PREFIX));
  };

  // Auth0 keeps its login session when the same person picks another organization.
  const getLoginSession = (person: PersonId, organization: OrganizationId) => {
    const current = world.getHeldSession(AUTH0_ID);

    if (current === null || current.ended || current.person !== person) {
      return world.openSession({ provider: AUTH0_ID, person, organization });
    }

    return world.updateSession(current.id, { organization }) ?? current;
  };

  const client = {
    getIdTokenClaims: async (): Promise<Auth0Claims | undefined> => {
      world.countCall();
      await world.waitForStorage();

      const session = world.getHeldSession(AUTH0_ID);

      return session === null ? undefined : getClaims(session);
    },
    getTokenSilently: async ({ cacheMode }: TokenOptions) => {
      world.countCall();

      const session = world.getHeldSession(AUTH0_ID);

      if (session === null) {
        throw createLoginRequiredError();
      }

      const cached = tokens.get(session.id);

      if (cacheMode === "on" && cached !== undefined) {
        return {
          access_token: cached,
          token_type: "Bearer",
          expires_in: 86400,
        };
      }

      // Skipping the cache is the refresh the lab slows; a cache miss is an ordinary round trip.
      await (cacheMode === "off"
        ? world.waitForRefresh()
        : world.waitForServer());

      const latest = world.getSession(session.id);

      if (latest === null || latest.ended) {
        throw createLoginRequiredError();
      }

      const token = world.issueToken(latest, AUTH0_TOKEN_PREFIX);

      if (world.getHeldSession(AUTH0_ID) === latest) {
        tokens.set(latest.id, token);
      }

      return { access_token: token, token_type: "Bearer", expires_in: 86400 };
    },
    logout: async ({ openUrl, logoutParams }: LogoutOptions) => {
      world.countCall();

      const session = world.getHeldSession(AUTH0_ID);

      world.holdSession(AUTH0_ID, null);

      if (session !== null) {
        tokens.delete(session.id);
      }

      const returnTo = logoutParams?.returnTo;

      openUrl(
        `${AUTH0_ISSUER}v2/logout?client_id=${AUTH0_CLIENT_ID}${returnTo === undefined ? "" : `&returnTo=${encodeURIComponent(returnTo)}`}`,
      );
    },
    loginWithPopup: async ({ authorizationParams }: PopupOptions) => {
      world.countCall();
      await world.waitForServer();

      const person = getPersonByEmail(authorizationParams.login_hint);

      if (person === null) {
        throw Object.assign(new Error("Wrong email or password."), {
          error: "access_denied",
        });
      }

      holdSession(
        getLoginSession(
          person,
          getOrganization(authorizationParams.organization) ??
            PEOPLE[person].organization,
        ),
      );
    },
  };

  return {
    client,
    /** Your backend updates the Auth0 user, and the next ID token carries the name. */
    updateUser: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      const session = world.getHeldSession(AUTH0_ID);

      if (session === null) {
        return;
      }

      world.setName(session.person, name);
    },
    // Another tab shares the cache, and auth0-spa-js tells no tab about it.
    signInElsewhere: () => {
      const current = world.getHeldSession(AUTH0_ID);
      const person = current === null ? "ada" : OTHER_PEOPLE[current.person];

      holdSession(
        world.openSession({
          provider: AUTH0_ID,
          person,
          organization: PEOPLE[person].organization,
        }),
      );
    },
  };
};
