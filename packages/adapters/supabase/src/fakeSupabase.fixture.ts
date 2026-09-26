import type { SupabaseClientLike } from "src/types/SupabaseClientLike";

type FakeUser = {
  id: string;
  email: string;
  is_anonymous: boolean;
  aud: string;
  app_metadata: { provider: string };
  user_metadata: { name: string };
};

type FakeSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: FakeUser;
};

type Listener = (event: string, session: FakeSession | null) => void;

const SESSION_MISSING = Object.freeze({
  name: "AuthSessionMissingError",
  message: "Auth session missing!",
});

// Modelled on supabase-js 2.117.1: each new subscriber hears INITIAL_SESSION once the client has initialized, then SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED and SIGNED_OUT.
export const createFakeSupabase = () => {
  const listeners = new Set<Listener>();
  const signOuts: unknown[] = [];
  const refreshes: string[] = [];

  const failures: { read: unknown; refresh: unknown; signOut: unknown } = {
    read: null,
    refresh: null,
    signOut: null,
  };

  let issued = 0;
  let current: FakeSession | null = null;

  const createSession = (user: FakeUser): FakeSession => {
    issued += 1;

    return {
      access_token: `access.${user.id}.${issued}`,
      refresh_token: `refresh.${user.id}.${issued}`,
      token_type: "bearer",
      expires_in: 3600,
      user,
    };
  };

  const createUser = (id: string, anonymous: boolean): FakeUser => ({
    id,
    email: anonymous ? "" : `${id}@example.com`,
    is_anonymous: anonymous,
    aud: "authenticated",
    app_metadata: { provider: anonymous ? "anonymous" : "email" },
    user_metadata: { name: id },
  });

  const emit = (event: string) => {
    for (const listener of [...listeners]) {
      listener(event, current);
    }
  };

  const sdk = {
    auth: {
      onAuthStateChange: (callback: Listener) => {
        listeners.add(callback);
        // supabase-js answers INITIAL_SESSION with null when reading the session failed.
        queueMicrotask(() => {
          if (!listeners.has(callback)) {
            return;
          }

          callback("INITIAL_SESSION", failures.read === null ? current : null);
        });

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      getSession: async () => {
        if (failures.read !== null) {
          return { data: { session: null }, error: failures.read };
        }

        return { data: { session: current }, error: null };
      },
      refreshSession: async () => {
        if (failures.refresh !== null) {
          return {
            data: { session: null, user: null },
            error: failures.refresh,
          };
        }

        if (current === null) {
          return {
            data: { session: null, user: null },
            error: SESSION_MISSING,
          };
        }

        refreshes.push(current.user.id);
        current = createSession(current.user);
        emit("TOKEN_REFRESHED");

        return { data: { session: current, user: current.user }, error: null };
      },
      signOut: async (options: { scope: "local" }) => {
        signOuts.push(options);

        if (failures.signOut !== null) {
          return { error: failures.signOut };
        }

        current = null;
        emit("SIGNED_OUT");

        return { error: null };
      },
    },
  } satisfies SupabaseClientLike;

  return {
    sdk,
    listeners,
    signOuts,
    refreshes,
    failures,
    current: () => current,
    signIn: (
      id: string,
      { anonymous = false }: { anonymous?: boolean } = {},
    ) => {
      current = createSession(createUser(id, anonymous));
      emit("SIGNED_IN");
    },
    refresh: () => {
      if (current === null) {
        return;
      }

      current = createSession(current.user);
      emit("TOKEN_REFRESHED");
    },
    rename: (name: string) => {
      if (current === null) {
        return;
      }

      current = {
        ...current,
        user: { ...current.user, user_metadata: { name } },
      };
      emit("USER_UPDATED");
    },
    switchSilently: (id: string) => {
      current = createSession(createUser(id, false));
    },
  };
};
