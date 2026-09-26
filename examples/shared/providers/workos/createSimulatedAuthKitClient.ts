import type {
  WorkosRefreshLike,
  WorkosUserLike,
} from "@priemskiyyy/anchor-workos";

import {
  WORKOS_ID,
  WORKOS_ORGANIZATION_IDS,
  WORKOS_TOKEN_PREFIX,
  WORKOS_USER_IDS,
} from "example-shared/providers/workos/constants/workos";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

/** The callbacks `createClient()` takes, the only way AuthKit reports a refresh. */
type ClientOptions = {
  onRefresh: (
    response: WorkosRefreshLike & { user: WorkosUserLike; accessToken: string },
  ) => void;
  onRefreshFailure: () => void;
};

type AuthKitState = "INITIAL" | "AUTHENTICATED" | "ERROR";

type HeldSession = { user: WorkosUserLike; accessToken: string };

// authkit-js's LoginRequiredError, which only its message tells apart.
const createLoginRequiredError = () => new Error("No access token available");

const createRefusedRefreshError = () =>
  Object.assign(new Error("Invalid refresh token"), {
    name: "RefreshError",
    status: 400,
    error: "invalid_grant",
    isTransient: false,
  });

const isRefusedRefresh = (error: unknown) =>
  error instanceof Error && error.name === "RefreshError";

const getOrganization = (workosOrganization: string) =>
  ORGANIZATION_IDS.find(
    (organization) =>
      WORKOS_ORGANIZATION_IDS[organization] === workosOrganization,
  ) ?? null;

// Modelled on authkit-js 0.20.2, as the adapter's own fake: the client keeps the user and the access token in this page's memory and calls onRefresh whenever it stores them, after a sign-in, a refresh and an organization switch; getAccessToken() refreshes when forced, before its first refresh and while it holds no token, and answers LoginRequiredError once WorkOS refused the refresh or there is nothing to refresh; a refused refresh clears the session and calls onRefreshFailure unless it was the first, while a network failure keeps the session and is thrown; signOut({ navigate: false }) clears the session and sends WorkOS a logout request whose answer it ignores. The refresh token lives in this browser, which every tab shares.
export const createSimulatedAuthKitClient = (
  world: LabWorld,
  { onRefresh, onRefreshFailure }: ClientOptions,
) => {
  let state: AuthKitState = "INITIAL";
  let held: HeldSession | null = null;

  const createUser = (person: PersonId): WorkosUserLike => {
    const fullName = world.getName(person);
    const [firstName = fullName, ...rest] = fullName.split(" ");

    return {
      id: WORKOS_USER_IDS[person],
      email: PEOPLE[person].email,
      emailVerified: true,
      firstName,
      lastName: rest.length === 0 ? null : rest.join(" "),
      profilePictureUrl: null,
    };
  };

  const store = (session: ServerSession) => {
    held = {
      user: createUser(session.person),
      accessToken: world.issueToken(session, WORKOS_TOKEN_PREFIX),
    };
    state = "AUTHENTICATED";
    onRefresh({
      user: held.user,
      accessToken: held.accessToken,
      organizationId:
        session.organization === null
          ? undefined
          : WORKOS_ORGANIZATION_IDS[session.organization],
    });
  };

  // A refresh uses the refresh token this browser holds when it lands, which another page may have replaced.
  const refresh = async (
    wait: () => Promise<void>,
    organization?: OrganizationId,
  ) => {
    const beginning = state;

    try {
      await wait();
    } catch (error) {
      state = "AUTHENTICATED";

      throw error;
    }

    const current = world.getHeldSession(WORKOS_ID);

    if (current === null || current.ended) {
      held = null;
      world.holdSession(WORKOS_ID, null);
      state = "ERROR";

      if (beginning !== "INITIAL") {
        onRefreshFailure();
      }

      throw createRefusedRefreshError();
    }

    store(
      organization === undefined
        ? current
        : (world.updateSession(current.id, { organization }) ?? current),
    );
  };

  const shouldRefresh = () =>
    state === "INITIAL" || (state === "AUTHENTICATED" && held === null);

  const client = {
    getUser: () => {
      world.countCall();

      return held === null ? null : held.user;
    },
    getAccessToken: async ({ forceRefresh }: { forceRefresh: boolean }) => {
      world.countCall();

      if (forceRefresh || shouldRefresh()) {
        try {
          await refresh(
            forceRefresh ? world.waitForRefresh : world.waitForServer,
          );
        } catch (error) {
          if (isRefusedRefresh(error)) {
            throw createLoginRequiredError();
          }

          throw error;
        }
      }

      if (held === null) {
        throw createLoginRequiredError();
      }

      return held.accessToken;
    },
    signOut: async () => {
      world.countCall();

      if (held === null) {
        throw new Error("SignOut() called without an active session.");
      }

      const current = world.getHeldSession(WORKOS_ID);

      held = null;
      world.holdSession(WORKOS_ID, null);

      // AuthKit sends WorkOS its logout request without CORS and ignores whatever happens to it.
      try {
        await world.waitForServer();
      } catch {
        return;
      }

      if (current === null) {
        return;
      }

      world.endSession(current.id);
    },
    // AuthKit's signIn() leaves for WorkOS's hosted page and comes back through the redirect callback, which the lab lands in this page.
    signIn: async ({
      loginHint,
      organizationId,
    }: {
      loginHint: string;
      organizationId: string;
    }) => {
      world.countCall();
      await world.waitForServer();

      const person = getPersonByEmail(loginHint);

      if (person === null) {
        throw new Error("Invalid credentials.");
      }

      const session = world.openSession({
        provider: WORKOS_ID,
        person,
        organization:
          getOrganization(organizationId) ?? PEOPLE[person].organization,
      });

      world.holdSession(WORKOS_ID, session);
      store(session);
    },
    switchToOrganization: async ({
      organizationId,
    }: {
      organizationId: string;
    }) => {
      world.countCall();
      await refresh(
        world.waitForServer,
        getOrganization(organizationId) ?? undefined,
      );
    },
  };

  return {
    client,
    // Harbor's backend renames the WorkOS user, and the refresh after it carries the new profile.
    updateUser: async (name: string) => {
      world.countCall();

      const current = world.getHeldSession(WORKOS_ID);

      if (current === null) {
        return;
      }

      await world.waitForServer();
      world.setName(current.person, name);
      await refresh(world.waitForServer);
    },
    // One tick of AuthKit's automatic refresh, which stores the same user and organization again.
    refreshAutomatically: async () => {
      world.countCall();

      if (held === null) {
        return;
      }

      await refresh(world.waitForServer);
    },
  };
};
