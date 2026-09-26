import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionLike } from "src/types/ClerkSessionLike";
import type { ClerkUserLike } from "src/types/ClerkUserLike";

type Listener = Parameters<ClerkLike["addListener"]>[0];

type TokenCall = Parameters<ClerkSessionLike["getToken"]>[0] & {
  session: string;
};

type FakeSignIn = {
  organization?: string;
  actor?: string;
  task?: string;
  /** Keeps the sessions already signed in, as a multi-session application does. */
  keepOthers?: boolean;
};

type FakeFailures = {
  /** `getToken()` rejects with this. */
  token: unknown;
  /** Removing a session rejects with this, as an unreachable Frontend API does while the browser is online. */
  removal: unknown;
  /** The browser is offline, so clerk-js answers a removal it could not send as if it had succeeded. */
  offline: boolean;
};

export const CLERK_FRONTEND_API = "clerk.example.com";

const createUser = (subject: string): ClerkUserLike => ({
  id: subject,
  externalId: null,
  username: subject,
  firstName: subject.toUpperCase(),
  lastName: null,
  fullName: subject.toUpperCase(),
  imageUrl: `https://img.clerk.com/${subject}`,
  primaryEmailAddress: { emailAddress: `${subject}@example.com` },
  primaryPhoneNumber: null,
});

// Modelled on clerk-js 6.32.1: addListener calls a new listener at once once the client has loaded, unless told to skip it, and removes it by replacing its list; load() emits the client's session before its status turns ready, and a failed load turns it to error; the status event bus calls its handlers from the live list, so removing one while they run skips the next; setActive() switches organization on the session itself, and it and signOut() emit an undefined session while they work; signOut() with one signed-in session removes every session on the client, whichever id it names, a removal emits the updated client, and offline a removal it could not send answers as if it had succeeded; getToken() records its options and answers a string.
export const createFakeClerk = ({ loaded = true } = {}) => {
  const tokens: TokenCall[] = [];
  const signOuts: Array<{ sessionId: string }> = [];
  const handlers: Array<() => void> = [];

  const failures: FakeFailures = {
    token: null,
    removal: null,
    offline: false,
  };

  let listeners: Listener[] = [];
  let signedIn: ClerkSessionLike[] = [];
  let staged: ClerkSessionLike | null = null;
  let interrupted: ClerkSessionLike | null | undefined;
  let sessions = 0;
  let issued = 0;

  const sdk: ClerkLike = {
    loaded: false,
    status: "loading",
    frontendApi: CLERK_FRONTEND_API,
    session: undefined,
    client: undefined,
    addListener: (listener, options) => {
      listeners.push(listener);

      if (sdk.client !== undefined && options?.skipInitialEmit !== true) {
        listener({ session: sdk.session });
      }

      return () => {
        listeners = listeners.filter((added) => added !== listener);
      };
    },
    on: (_event, handler) => {
      handlers.push(handler);
    },
    off: (_event, handler) => {
      handlers.splice(handlers.indexOf(handler) >>> 0, 1);
    },
    signOut: async (callback, { sessionId }) => {
      signOuts.push({ sessionId });

      if (sdk.client === undefined || signedIn.length === 0) {
        return;
      }

      const target = signedIn.find(({ id }) => id === sessionId);
      const removesEvery = signedIn.length === 1;

      if (!removesEvery && sdk.session?.id !== target?.id) {
        removeSessions((session) => session === target);

        return;
      }

      sdk.session = undefined;
      emit();

      if (failures.removal !== null) {
        throw failures.removal;
      }

      if (!failures.offline) {
        removeSessions((session) => removesEvery || session === target);
      }

      await callback();
      sdk.session = null;
      emit();
    },
  };

  const updateClient = () => {
    sdk.client = { signedInSessions: [...signedIn] };
  };

  const removeSessions = (
    isRemoved: (session: ClerkSessionLike) => boolean,
  ) => {
    signedIn = signedIn.filter((session) => !isRemoved(session));
    updateClient();
    emit();
  };

  const emit = () => {
    if (sdk.client === undefined) {
      return;
    }

    for (const listener of listeners) {
      listener({ session: sdk.session });
    }
  };

  // clerk-js calls its status handlers from the live list, as this loop does.
  const emitStatus = (status: ClerkLike["status"]) => {
    sdk.status = status;
    sdk.loaded = status === "ready" || status === "degraded";

    for (const handler of handlers) {
      handler();
    }
  };

  const createSession = (
    subject: string,
    { organization, actor, task }: FakeSignIn,
  ): ClerkSessionLike => {
    sessions += 1;

    const id = `sess_${sessions}`;

    const common = {
      id,
      lastActiveOrganizationId: organization ?? null,
      actor: actor === undefined ? null : { sub: actor },
      user: createUser(subject),
      getToken: async (
        options: Parameters<ClerkSessionLike["getToken"]>[0],
      ) => {
        tokens.push({ ...options, session: id });

        if (failures.token !== null) {
          throw failures.token;
        }

        issued += 1;

        return `${options.template ?? "session"}.${subject}.${issued}`;
      },
    };

    if (task === undefined) {
      return { ...common, status: "active" };
    }

    return { ...common, status: "pending", currentTask: { key: task } };
  };

  const loadClient = () => {
    sdk.session = staged;
    updateClient();
    emit();
  };

  const finishLoading = () => {
    loadClient();
    emitStatus("ready");
  };

  if (loaded) {
    finishLoading();
  }

  return {
    sdk,
    tokens,
    signOuts,
    failures,
    listeners: () => listeners.length + handlers.length,
    loadClient,
    markReady: () => emitStatus("ready"),
    finishLoading,
    failLoading: () => emitStatus("error"),
    signIn: (subject: string, options: FakeSignIn = {}) => {
      const session = createSession(subject, options);

      signedIn =
        options.keepOthers === true ? [...signedIn, session] : [session];

      if (sdk.client === undefined) {
        staged = session;

        return session;
      }

      sdk.session = session;
      updateClient();
      emit();

      return session;
    },
    switchSilently: (subject: string) => {
      const session = createSession(subject, {});

      signedIn = [session];
      sdk.session = session;
      updateClient();

      return session;
    },
    setActiveOrganization: (organization: string | null) => {
      const { session } = sdk;

      if (session === null || session === undefined) {
        return;
      }

      session.lastActiveOrganizationId = organization;
      emit();
    },
    completeTask: () => {
      const { session } = sdk;

      if (session === null || session === undefined) {
        return;
      }

      const active: ClerkSessionLike = { ...session, status: "active" };

      signedIn = signedIn.map((held) => (held === session ? active : held));
      sdk.session = active;
      updateClient();
      emit();
    },
    beginTransition: () => {
      interrupted = sdk.session;
      sdk.session = undefined;
      emit();
    },
    // setActive() lands on the session it left, as one that only navigated does.
    endTransition: () => {
      sdk.session = interrupted ?? null;
      emit();
    },
    endElsewhere: () => {
      signedIn = [];
      sdk.session = null;
      updateClient();
      emit();
    },
  };
};
