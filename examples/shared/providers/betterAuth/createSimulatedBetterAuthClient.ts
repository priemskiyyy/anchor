import type {
  BetterAuthSessionLike,
  BetterAuthSessionStateLike,
} from "@priemskiyyy/anchor-better-auth";

import {
  BETTER_AUTH_ID,
  BETTER_AUTH_USER_IDS,
  FETCH_FAILED_ERROR,
  UNAUTHORIZED_ERROR,
} from "example-shared/providers/betterAuth/constants/betterAuth";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type SessionListener = (value: BetterAuthSessionStateLike) => void;

type Flight = { cancelled: boolean; finish: () => void; done: Promise<void> };

const createFlight = (): Flight => {
  let finish = () => {};

  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  return { cancelled: false, finish: () => finish(), done };
};

// Modelled on better-auth 1.7.6's session atom, as the adapter's own fake: a new subscriber hears the current value at once and the first one's mount starts a fetch; each fetch marks the atom pending or refetching, keeps its data when the network fails, empties it on a 401 and is cancelled by a newer one; a sign-in, a sign-out, an update or another tab's broadcast refetches while the atom has subscribers.
export const createSimulatedBetterAuthClient = (world: LabWorld) => {
  const listeners = new Set<SessionListener>();
  let flight: Flight | null = null;

  const getPayload = (session: ServerSession): BetterAuthSessionLike => ({
    user: {
      id: BETTER_AUTH_USER_IDS[session.person],
      name: world.getName(session.person),
      email: PEOPLE[session.person].email,
      emailVerified: true,
      image: null,
    },
    session: {
      id: session.id,
      activeOrganizationId: session.organization,
      activeTeamId: null,
      impersonatedBy: null,
    },
  });

  const publish = (next: BetterAuthSessionStateLike) => {
    value = next;

    for (const listener of [...listeners]) {
      listener(value);
    }
  };

  // The session endpoint answers for the cookie this browser holds when the answer is computed.
  const getFetchedValue = (): BetterAuthSessionStateLike => {
    const session = world.getHeldSession(BETTER_AUTH_ID);
    const settled = { ...value, isPending: false, isRefetching: false };

    if (session === null) {
      return { ...settled, data: null, error: null };
    }

    if (session.ended) {
      return { ...settled, data: null, error: UNAUTHORIZED_ERROR };
    }

    return { ...settled, data: getPayload(session), error: null };
  };

  const settleFlight = (
    started: Flight,
    getNext: () => BetterAuthSessionStateLike,
  ) => {
    if (!started.cancelled) {
      publish(getNext());
      flight = null;
    }

    started.finish();
  };

  const fetchSession = () => {
    if (flight !== null) {
      flight.cancelled = true;
      flight.finish();
    }

    const started = createFlight();

    flight = started;
    queueMicrotask(() => {
      if (started.cancelled) {
        return;
      }

      publish({
        ...value,
        isPending: value.data === null,
        isRefetching: true,
        error: null,
      });
      world.waitForServer().then(
        () => settleFlight(started, getFetchedValue),
        (error: unknown) =>
          settleFlight(started, () => ({
            ...value,
            error,
            isPending: false,
            isRefetching: false,
          })),
      );
    });

    return started.done;
  };

  let value: BetterAuthSessionStateLike = {
    data: null,
    error: null,
    isPending: true,
    isRefetching: false,
    refetch: () => {
      world.countCall();

      return fetchSession();
    },
  };

  const refetchWhileObserved = () => {
    if (listeners.size === 0) {
      return;
    }

    fetchSession();
  };

  const addListener = (listener: SessionListener) => {
    listeners.add(listener);

    if (listeners.size === 1) {
      queueMicrotask(() => {
        if (flight !== null) {
          return;
        }

        fetchSession();
      });
    }

    return () => {
      listeners.delete(listener);
    };
  };

  const openSession = (person: PersonId) =>
    world.openSession({
      provider: BETTER_AUTH_ID,
      person,
      organization: PEOPLE[person].organization,
    });

  const client = {
    $store: {
      atoms: {
        session: {
          get: () => value,
          subscribe: (listener: SessionListener) => {
            world.countCall();

            const remove = addListener(listener);

            listener(value);

            return remove;
          },
          listen: (listener: SessionListener) => {
            world.countCall();

            return addListener(listener);
          },
        },
      },
    },
    signOut: async () => {
      world.countCall();
      await world.waitForServer();

      const session = world.getHeldSession(BETTER_AUTH_ID);

      if (session !== null) {
        world.endSession(session.id);
      }

      world.holdSession(BETTER_AUTH_ID, null);
      refetchWhileObserved();

      return { data: { success: true }, error: null };
    },
    signIn: {
      email: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        world.countCall();

        try {
          await world.waitForServer();
        } catch {
          return { data: null, error: FETCH_FAILED_ERROR };
        }

        const person = getPersonByEmail(email);

        if (person === null || password === "") {
          return { data: null, error: UNAUTHORIZED_ERROR };
        }

        const session = openSession(person);

        world.holdSession(BETTER_AUTH_ID, session);
        refetchWhileObserved();

        return { data: getPayload(session), error: null };
      },
    },
    organization: {
      setActive: async ({
        organizationId,
      }: {
        organizationId: OrganizationId;
      }) => {
        world.countCall();

        try {
          await world.waitForServer();
        } catch {
          return { data: null, error: FETCH_FAILED_ERROR };
        }

        const session = world.getHeldSession(BETTER_AUTH_ID);

        if (session === null || session.ended) {
          return { data: null, error: UNAUTHORIZED_ERROR };
        }

        world.updateSession(session.id, { organization: organizationId });
        refetchWhileObserved();

        return { data: { id: organizationId }, error: null };
      },
    },
    updateUser: async ({ name }: { name: string }) => {
      world.countCall();

      try {
        await world.waitForServer();
      } catch {
        return { data: null, error: FETCH_FAILED_ERROR };
      }

      const session = world.getHeldSession(BETTER_AUTH_ID);

      if (session === null || session.ended) {
        return { data: null, error: UNAUTHORIZED_ERROR };
      }

      world.setName(session.person, name);
      refetchWhileObserved();

      return { data: { status: true }, error: null };
    },
  };

  return {
    client,
    signInElsewhere: () => {
      const current = world.getHeldSession(BETTER_AUTH_ID);

      world.holdSession(
        BETTER_AUTH_ID,
        openSession(current === null ? "ada" : OTHER_PEOPLE[current.person]),
      );
      refetchWhileObserved();
    },
    // A window focus refetch that finds the same session publishes it again.
    sendDuplicateEvent: () => {
      publish({ ...value });
    },
  };
};
