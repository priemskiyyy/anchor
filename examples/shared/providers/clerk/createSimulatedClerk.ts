import type {
  ClerkLike,
  ClerkSessionLike,
  ClerkUserLike,
} from "@priemskiyyy/anchor-clerk";

import {
  CLERK_API_TEMPLATE,
  CLERK_FRONTEND_API,
  CLERK_ID,
  CLERK_ORGANIZATION_IDS,
  CLERK_TOKEN_PREFIX,
  CLERK_USER_IDS,
  SETUP_MFA_TASK,
} from "example-shared/providers/clerk/constants/clerk";
import { ORGANIZATION_IDS } from "example-shared/world/constants/organizations";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { HARBOR_ORIGIN } from "example-shared/world/constants/world";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type Listener = Parameters<ClerkLike["addListener"]>[0];

type TokenOptions = Parameters<ClerkSessionLike["getToken"]>[0];

type SimulatedClerk = ClerkLike & {
  load: () => Promise<void>;
  setActive: (options: { organization: string }) => Promise<void>;
};

const createClerkError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

const getOrganization = (clerkOrganization: string) =>
  ORGANIZATION_IDS.find(
    (organization) =>
      CLERK_ORGANIZATION_IDS[organization] === clerkOrganization,
  ) ?? null;

// Modelled on clerk-js 6.32.1, as the adapter's own fake: addListener calls a new listener at once once the client has loaded, load() emits the client's session before its status turns ready and turns it to error when it fails, setActive() and signOut() emit an undefined session while they work, a 401 from the Frontend API makes clerk-js fetch the client and sign out when it holds no session, as another tab's sign-out broadcast does, a signed-in client refuses a second sign-in, and a removal clerk-js could not send is answered as done while the client keeps the session. The client lives in a cookie every tab shares.
export const createSimulatedClerk = (world: LabWorld) => {
  const handlers: (() => void)[] = [];
  const tokens = new Map<string, string>();
  const armed = { lostRemoval: false };
  let listeners: Listener[] = [];

  const getClientSession = () => {
    const held = world.getHeldSession(CLERK_ID);

    return held === null || held.ended ? null : held;
  };

  const createUser = (person: PersonId): ClerkUserLike => {
    const fullName = world.getName(person);
    const [firstName = fullName, ...rest] = fullName.split(" ");

    return {
      id: CLERK_USER_IDS[person],
      externalId: null,
      username: null,
      firstName,
      lastName: rest.length === 0 ? null : rest.join(" "),
      fullName,
      imageUrl: `${HARBOR_ORIGIN}/avatars/${person}.png`,
      primaryEmailAddress: { emailAddress: PEOPLE[person].email },
      primaryPhoneNumber: null,
    };
  };

  const emit = () => {
    if (instance.client === undefined) {
      return;
    }

    for (const listener of [...listeners]) {
      listener({ session: instance.session });
    }
  };

  // clerk-js calls its status handlers from the live list.
  const emitStatus = (status: ClerkLike["status"]) => {
    instance.status = status;
    instance.loaded = status === "ready" || status === "degraded";

    for (const handler of handlers) {
      handler();
    }
  };

  const publish = (server: ServerSession | null) => {
    instance.client = {
      signedInSessions: server === null ? [] : [{ id: server.id }],
    };
    instance.session = server === null ? null : createSession(server);
    emit();
  };

  const beginTransition = () => {
    instance.session = undefined;
    emit();
  };

  // What clerk-js does after a 401 from the Frontend API or another tab's sign-out broadcast: it fetches the client, and signs out when that holds no session.
  const handleUnauthenticated = async () => {
    if (instance.session === null || instance.session === undefined) {
      return;
    }

    await world.waitForServer();

    if (getClientSession() !== null) {
      return;
    }

    world.holdSession(CLERK_ID, null);
    beginTransition();
    publish(null);
  };

  const getSessionToken = async (
    id: string,
    { template, skipCache }: TokenOptions,
  ) => {
    world.countCall();

    // clerk-js keys its token cache by session, template and active organization.
    const key = [
      id,
      template ?? "session",
      world.getSession(id)?.organization ?? "none",
    ].join(".");

    const cached = tokens.get(key);

    if (cached !== undefined && !skipCache) {
      return cached;
    }

    await (skipCache ? world.waitForRefresh() : world.waitForServer());

    const server = world.getSession(id);

    if (server === null || server.ended) {
      await handleUnauthenticated();

      return null;
    }

    // Only the template Harbor configured carries the claims its API checks; any other token is Clerk's own.
    const token =
      template === CLERK_API_TEMPLATE
        ? world.issueToken(server, CLERK_TOKEN_PREFIX)
        : `clerk-session-token.${server.id}`;

    tokens.set(key, token);

    return token;
  };

  const createSession = (server: ServerSession): ClerkSessionLike => {
    const common = {
      id: server.id,
      lastActiveOrganizationId:
        server.organization === null
          ? null
          : CLERK_ORGANIZATION_IDS[server.organization],
      actor: null,
      user: createUser(server.person),
      getToken: (options: TokenOptions) => getSessionToken(server.id, options),
    };

    if (server.action === null) {
      return { ...common, status: "active" };
    }

    return {
      ...common,
      status: "pending",
      currentTask: { key: server.action },
    };
  };

  // Offline, clerk-js answers a removal it could not send as done, and its client keeps the session.
  const removeSession = async (id: string) => {
    try {
      await world.waitForServer();
    } catch {
      return;
    }

    world.endSession(id);
    world.holdSession(CLERK_ID, null);
    instance.client = { signedInSessions: [] };
  };

  const updateClientSession = async (
    changes: Parameters<LabWorld["updateSession"]>[1],
  ) => {
    world.countCall();

    const server = getClientSession();

    if (server === null) {
      return;
    }

    await world.waitForServer();
    publish(world.updateSession(server.id, changes) ?? server);
  };

  const instance: SimulatedClerk = {
    loaded: false,
    status: "loading",
    frontendApi: CLERK_FRONTEND_API,
    session: undefined,
    client: undefined,
    addListener: (listener, options) => {
      listeners.push(listener);

      if (instance.client !== undefined && options?.skipInitialEmit !== true) {
        listener({ session: instance.session });
      }

      return () => {
        listeners = listeners.filter((added) => added !== listener);
      };
    },
    on: (_event, handler) => {
      handlers.push(handler);
    },
    off: (_event, handler) => {
      const index = handlers.indexOf(handler);

      if (index === -1) {
        return;
      }

      handlers.splice(index, 1);
    },
    signOut: async (callback, { sessionId }) => {
      world.countCall();

      const { session } = instance;

      if (
        session === null ||
        session === undefined ||
        session.id !== sessionId
      ) {
        return;
      }

      beginTransition();

      const lost = armed.lostRemoval;

      armed.lostRemoval = false;

      if (!lost) {
        await removeSession(sessionId);
      }

      callback();
      instance.session = null;
      emit();
    },
    load: async () => {
      world.countCall();

      try {
        await world.waitForServer();
      } catch (error) {
        emitStatus("error");

        throw error;
      }

      publish(getClientSession());
      emitStatus("ready");
    },
    setActive: async ({ organization }) => {
      world.countCall();

      const server = getClientSession();

      if (server === null) {
        return;
      }

      await world.waitForServer();
      beginTransition();
      publish(
        world.updateSession(server.id, {
          organization: getOrganization(organization),
        }) ?? server,
      );
    },
  };

  return {
    instance,
    // The sign-in and setActive() of its session, together.
    signIn: async (email: string, organization: OrganizationId) => {
      world.countCall();

      if (instance.session !== null && instance.session !== undefined) {
        throw createClerkError("session_exists", "You're already signed in.");
      }

      await world.waitForServer();

      const person = getPersonByEmail(email);

      if (person === null) {
        throw createClerkError(
          "form_identifier_not_found",
          "Couldn't find your account.",
        );
      }

      const server = world.openSession({
        provider: CLERK_ID,
        person,
        organization,
      });

      world.holdSession(CLERK_ID, server);
      beginTransition();
      publish(server);
    },
    // user.update() on the Frontend API, whose answer updates the client and calls the listeners.
    updateUser: async (name: string) => {
      world.countCall();

      const server = getClientSession();

      if (server === null) {
        return;
      }

      await world.waitForServer();
      world.setName(server.person, name);
      publish(server);
    },
    // Clerk now requires two-factor, and the session touch clerk-js makes on focus brings the pending session here.
    requireTwoFactor: () => updateClientSession({ action: SETUP_MFA_TASK }),
    completeTask: () => updateClientSession({ action: null }),
    // The other tab shares this client, which refuses a second sign-in: it signs Ada out and broadcasts that, then signs the other person in.
    signInElsewhere: async () => {
      const server = getClientSession();

      if (server === null) {
        return;
      }

      world.endSession(server.id);
      world.holdSession(CLERK_ID, null);
      await handleUnauthenticated();

      const person = OTHER_PEOPLE[server.person];

      world.holdSession(
        CLERK_ID,
        world.openSession({
          provider: CLERK_ID,
          person,
          organization: PEOPLE[person].organization,
        }),
      );
    },
    loseNextRemoval: () => {
      armed.lostRemoval = true;
    },
    sendDuplicateEvent: emit,
  };
};
