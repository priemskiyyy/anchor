import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionStateLike } from "src/types/BetterAuthSessionStateLike";

type Listener = (value: BetterAuthSessionStateLike) => void;

type FakeError = { status: number; statusText: string };

type FakeSignIn = {
  organization?: string;
  team?: string;
  anonymous?: boolean;
  impersonatedBy?: string;
};

type FakeFailures = {
  /** The session endpoint answers this HTTP error. */
  fetch: FakeError | null;
  /** The network fails, so the session fetch throws this. */
  network: Error | null;
  /** The sign-out endpoint answers this HTTP error. */
  signOut: FakeError | null;
  /** The network fails, so the sign-out throws this. */
  signOutNetwork: Error | null;
};

type Flight = {
  cancelled: boolean;
  finish: () => void;
  done: Promise<void>;
};

const createUser = (id: string, anonymous: boolean) => ({
  id,
  name: anonymous ? "Anonymous" : id.toUpperCase(),
  email: anonymous ? `temp-${id}@anonymous.example.com` : `${id}@example.com`,
  emailVerified: !anonymous,
  image: null,
  isAnonymous: anonymous,
  role: "user",
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

type FakeSession = {
  user: ReturnType<typeof createUser>;
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    activeOrganizationId: string | null;
    activeTeamId: string | null;
    impersonatedBy: string | null;
  };
};

const createFlight = (): Flight => {
  let finish = () => {};

  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  return { cancelled: false, finish: () => finish(), done };
};

// Modelled on better-auth 1.7.6's session atom: a new subscriber hears the current value at once; the first subscriber's mount joins a fetch in flight or starts one; each fetch marks the atom pending or refetching, keeps its data when it fails except on a 401, and is cancelled by a newer one; a sign-in, a sign-out or an update through the client refetches while it has subscribers. With `expo`, it is modelled on @better-auth/expo 1.7.6 as well: the first fetch restores a cached session into an atom without data, and a sign-out clears the stored session before asking the server.
export const createFakeBetterAuthClient = ({ expo = false } = {}) => {
  const listeners = new Set<Listener>();
  const held: Array<() => void> = [];

  const failures: FakeFailures = {
    fetch: null,
    network: null,
    signOut: null,
    signOutNetwork: null,
  };

  let sessions = 0;
  let signOuts = 0;
  let holdFetches = false;
  let flight: Flight | null = null;
  let cached: FakeSession | null = null;
  let current: FakeSession | null = null;

  const publish = (next: BetterAuthSessionStateLike) => {
    value = next;

    for (const listener of [...listeners]) {
      listener(value);
    }
  };

  const getOutcome = (): BetterAuthSessionStateLike => {
    if (failures.network !== null) {
      return {
        ...value,
        error: failures.network,
        isPending: false,
        isRefetching: false,
      };
    }

    if (failures.fetch !== null) {
      return {
        ...value,
        data: failures.fetch.status === 401 ? null : value.data,
        error: failures.fetch,
        isPending: false,
        isRefetching: false,
      };
    }

    return {
      ...value,
      data: current,
      error: null,
      isPending: false,
      isRefetching: false,
    };
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

      if (cached !== null && value.data === null) {
        publish({ ...value, data: cached });
        cached = null;
      }

      const settle = () => {
        if (!started.cancelled) {
          publish(getOutcome());
          flight = null;
        }

        started.finish();
      };

      if (holdFetches) {
        held.push(settle);
      } else {
        queueMicrotask(settle);
      }
    });

    return started.done;
  };

  let value: BetterAuthSessionStateLike = {
    data: null,
    error: null,
    isPending: true,
    isRefetching: false,
    refetch: fetchSession,
  };

  // The client toggles its session signal after a sign-in, a sign-out or an update, and only a subscribed atom refetches on it.
  const notify = () => {
    if (listeners.size === 0) {
      return;
    }

    fetchSession();
  };

  const addListener = (listener: Listener) => {
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

  const createSession = (
    id: string,
    { organization, team, anonymous = false, impersonatedBy }: FakeSignIn,
  ): FakeSession => {
    sessions += 1;

    return {
      user: createUser(id, anonymous),
      session: {
        id: `session_${sessions}`,
        token: `token_${sessions}`,
        userId: id,
        expiresAt: new Date(86_400_000),
        activeOrganizationId: organization ?? null,
        activeTeamId: team ?? null,
        impersonatedBy: impersonatedBy ?? null,
      },
    };
  };

  const sdk = {
    $store: {
      atoms: {
        session: {
          get: () => value,
          subscribe: (listener: Listener) => {
            const remove = addListener(listener);

            listener(value);

            return remove;
          },
          listen: addListener,
        },
      },
    },
    signOut: async () => {
      signOuts += 1;

      if (expo) {
        current = null;
        publish({ ...value, data: null, error: null, isPending: false });
      }

      if (failures.signOutNetwork !== null) {
        throw failures.signOutNetwork;
      }

      if (failures.signOut !== null) {
        return { data: null, error: failures.signOut };
      }

      current = null;
      notify();

      return { data: { success: true }, error: null };
    },
  } satisfies BetterAuthClientLike;

  return {
    sdk,
    listeners,
    failures,
    held,
    value: () => value,
    signOuts: () => signOuts,
    current: () => current,
    refetch: fetchSession,
    holdFetches: () => {
      holdFetches = true;
    },
    settleFetches: () => {
      holdFetches = false;

      for (const settle of held.splice(0)) {
        settle();
      }
    },
    signIn: (id: string, options: FakeSignIn = {}) => {
      current = createSession(id, options);
      notify();
    },
    switchSilently: (id: string, options: FakeSignIn = {}) => {
      current = createSession(id, options);
    },
    cacheSession: (id: string) => {
      cached = createSession(id, {});
      current = cached;
    },
    endOnServer: () => {
      current = null;
    },
    setActiveOrganization: (organization: string) => {
      if (current === null) {
        return;
      }

      current = {
        ...current,
        session: { ...current.session, activeOrganizationId: organization },
      };
      notify();
    },
    rename: (name: string) => {
      if (current === null) {
        return;
      }

      current = { ...current, user: { ...current.user, name } };
      notify();
    },
  };
};
