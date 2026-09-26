import { vi } from "vitest";

import type { AuthjsClientLike } from "src/types/AuthjsClientLike";
import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";
import { SESSION_BROADCAST_KEY } from "src/utils/constants/authjs";

type FakeSignIn = {
  /** Leaves the id out of the client session, as Auth.js does without a session callback that adds it. */
  withoutId?: boolean;
};

type FakeFailures = {
  /** The network fails, so a request to the session endpoint throws. */
  network: boolean;
  /** The session endpoint answers this HTTP status instead of the session. */
  status: number | null;
  /** The sign-out's CSRF token is refused, so the server keeps the session and answers its sign-out page. */
  csrf: boolean;
  /** The sign-out request itself fails, which next-auth's client lets through. */
  signOut: unknown;
};

const createSession = (
  subject: string,
  { withoutId = false }: FakeSignIn,
): AuthjsSessionLike & { expires: string } => ({
  user: {
    ...(withoutId ? {} : { id: subject }),
    name: subject.toUpperCase(),
    email: `${subject}@example.com`,
    image: null,
  },
  expires: "2026-10-24T00:00:00.000Z",
});

// Another tab's next-auth writes its broadcast to localStorage, which reaches this tab as a storage event.
const broadcastFromAnotherTab = (trigger: "signout" | "getSession") => {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: SESSION_BROADCAST_KEY,
      newValue: JSON.stringify({
        event: "session",
        data: { trigger },
        timestamp: 1_790_000_000,
      }),
    }),
  );
};

// Modelled on next-auth 4.24.15's next-auth/react and its REST API: GET {basePath}/session answers the session, or an empty object for none, and getSession() fetches it, answers null both for none and for a request that failed, and broadcasts to the other tabs unless told not to; signOut({ redirect: false }) posts the CSRF token it fetched, the server clears the session cookie only when that token is valid and answers its sign-out page otherwise, and either way the client broadcasts and resolves the page it was given.
export const createFakeNextAuthReact = () => {
  const sessionRequests: Array<{ broadcast: boolean }> = [];
  const broadcasts: Array<"signout" | "getSession"> = [];
  const signOuts: Array<{ redirect: boolean }> = [];
  const endpointRequests: string[] = [];

  const failures: FakeFailures = {
    network: false,
    status: null,
    csrf: false,
    signOut: null,
  };

  let server: (AuthjsSessionLike & { expires: string }) | null = null;

  // The session endpoint of the REST API, installed as the global fetch.
  vi.stubGlobal("fetch", async (input: string) => {
    endpointRequests.push(input);

    if (failures.network) {
      throw new TypeError("Failed to fetch");
    }

    if (failures.status !== null) {
      return Response.json(
        { message: "Internal Server Error" },
        { status: failures.status },
      );
    }

    return Response.json(server ?? {});
  });

  const sdk: AuthjsClientLike = {
    getSession: async ({ broadcast }) => {
      sessionRequests.push({ broadcast });

      if (broadcast) {
        broadcasts.push("getSession");
      }

      return failures.network || failures.status !== null ? null : server;
    },
    signOut: async ({ redirect }) => {
      signOuts.push({ redirect });

      if (failures.signOut !== null) {
        throw failures.signOut;
      }

      broadcasts.push("signout");

      if (failures.csrf) {
        return { url: "http://localhost:3000/api/auth/signout?csrf=true" };
      }

      server = null;

      return { url: "http://localhost:3000/" };
    },
  };

  return {
    sdk,
    endpointRequests,
    sessionRequests,
    broadcasts,
    signOuts,
    failures,
    session: () => server,
    signIn: (subject: string, options: FakeSignIn = {}) => {
      server = createSession(subject, options);
    },
    signInElsewhere: (subject: string) => {
      server = createSession(subject, {});
      broadcastFromAnotherTab("getSession");
    },
    signOutElsewhere: () => {
      server = null;
      broadcastFromAnotherTab("signout");
    },
  };
};

// Counts the storage listeners added to window and not removed since, which in a test are the adapter's.
export const countStorageListeners = () => {
  const added = vi.spyOn(window, "addEventListener");
  const removed = vi.spyOn(window, "removeEventListener");

  return () =>
    added.mock.calls.filter(([type]) => type === "storage").length -
    removed.mock.calls.filter(([type]) => type === "storage").length;
};
