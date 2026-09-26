import {
  INVALID_CREDENTIALS_ERROR,
  REFRESH_REFUSED_ERROR,
  RETRYABLE_FETCH_ERROR,
  SESSION_MISSING_ERROR,
  SUPABASE_EVENTS,
  SUPABASE_ID,
  SUPABASE_TOKEN_PREFIX,
  SUPABASE_USER_IDS,
} from "example-shared/providers/supabase/constants/supabase";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type SupabaseUser = {
  id: string;
  email: string;
  is_anonymous: boolean;
  aud: string;
  app_metadata: { provider: string };
  user_metadata: { name: string };
};

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SupabaseUser;
};

type AuthListener = (event: string, session: SupabaseSession | null) => void;

type HeldSession = { server: ServerSession; session: SupabaseSession };

const NO_SESSION = { session: null, user: null };

// Modelled on supabase-js 2.117.1, as the adapter's own fake: each subscriber hears INITIAL_SESSION once the client restored its storage, then SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED and SIGNED_OUT, in every tab; a refresh the server refuses removes the session, and a sign-out that fails keeps it.
export const createSimulatedSupabase = (world: LabWorld) => {
  const listeners = new Set<AuthListener>();
  let held: HeldSession | null = null;

  const getCurrentSession = () => (held === null ? null : held.session);

  const emit = (event: string) => {
    const session = getCurrentSession();

    for (const listener of [...listeners]) {
      listener(event, session);
    }
  };

  const createSession = (server: ServerSession): SupabaseSession => ({
    access_token: world.issueToken(server, SUPABASE_TOKEN_PREFIX),
    refresh_token: `refresh.${server.id}`,
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: SUPABASE_USER_IDS[server.person],
      email: PEOPLE[server.person].email,
      is_anonymous: false,
      aud: "authenticated",
      app_metadata: { provider: "email" },
      user_metadata: { name: world.getName(server.person) },
    },
  });

  const holdSession = (server: ServerSession | null) => {
    world.holdSession(SUPABASE_ID, server);
    held = server === null ? null : { server, session: createSession(server) };
  };

  const openSession = (person: PersonId) =>
    world.openSession({ provider: SUPABASE_ID, person, organization: null });

  const initializing = world.waitForStorage().then(() => {
    const server = world.getHeldSession(SUPABASE_ID);

    held = server === null ? null : { server, session: createSession(server) };
  });

  const sdk = {
    auth: {
      onAuthStateChange: (callback: AuthListener) => {
        world.countCall();
        listeners.add(callback);
        initializing.then(() => {
          if (!listeners.has(callback)) {
            return;
          }

          callback(SUPABASE_EVENTS.initialSession, getCurrentSession());
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
        world.countCall();
        await initializing;

        return { data: { session: getCurrentSession() }, error: null };
      },
      refreshSession: async () => {
        world.countCall();

        const refreshing = held;

        if (refreshing === null) {
          return { data: NO_SESSION, error: SESSION_MISSING_ERROR };
        }

        try {
          await world.waitForRefresh();
        } catch {
          return { data: NO_SESSION, error: RETRYABLE_FETCH_ERROR };
        }

        const latest = world.getSession(refreshing.server.id);

        if (latest === null || latest.ended) {
          if (held === refreshing) {
            holdSession(null);
            emit(SUPABASE_EVENTS.signedOut);
          }

          return { data: NO_SESSION, error: REFRESH_REFUSED_ERROR };
        }

        const session = createSession(latest);

        // The refreshed session is stored only while it is still the one this client holds.
        if (held === refreshing) {
          held = { server: latest, session };
          emit(SUPABASE_EVENTS.tokenRefreshed);
        }

        return { data: { session, user: session.user }, error: null };
      },
      signOut: async () => {
        world.countCall();

        const ending = held;

        if (ending === null) {
          return { error: null };
        }

        try {
          await world.waitForServer();
        } catch {
          return { error: RETRYABLE_FETCH_ERROR };
        }

        world.endSession(ending.server.id);

        if (held === ending) {
          holdSession(null);
          emit(SUPABASE_EVENTS.signedOut);
        }

        return { error: null };
      },
      signInWithPassword: async ({
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
          return { data: NO_SESSION, error: RETRYABLE_FETCH_ERROR };
        }

        const person = getPersonByEmail(email);

        if (person === null || password === "") {
          return { data: NO_SESSION, error: INVALID_CREDENTIALS_ERROR };
        }

        holdSession(openSession(person));
        emit(SUPABASE_EVENTS.signedIn);

        return { data: { session: getCurrentSession() }, error: null };
      },
      updateUser: async ({ data }: { data: { name: string } }) => {
        world.countCall();

        const updating = held;

        if (updating === null) {
          return { data: { user: null }, error: SESSION_MISSING_ERROR };
        }

        try {
          await world.waitForServer();
        } catch {
          return { data: { user: null }, error: RETRYABLE_FETCH_ERROR };
        }

        world.setName(updating.server.person, data.name);

        if (held !== updating) {
          return { data: { user: null }, error: null };
        }

        const user = { ...updating.session.user, user_metadata: data };

        held = {
          server: updating.server,
          session: { ...updating.session, user },
        };
        emit(SUPABASE_EVENTS.userUpdated);

        return { data: { user }, error: null };
      },
    },
  };

  return {
    sdk,
    signInElsewhere: () => {
      const person = held === null ? "ada" : OTHER_PEOPLE[held.server.person];

      holdSession(openSession(person));
      emit(SUPABASE_EVENTS.signedIn);
    },
    // supabase-js says SIGNED_IN again for the session it holds whenever the tab becomes visible.
    sendDuplicateEvent: () => {
      emit(SUPABASE_EVENTS.signedIn);
    },
  };
};
