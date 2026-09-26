import { createValueStore } from "example-shared/utils/createValueStore";
import { ORGANIZATIONS } from "example-shared/world/constants/organizations";
import { PEOPLE } from "example-shared/world/constants/people";
import { PROJECTS } from "example-shared/world/constants/projects";
import {
  INITIAL_WORLD_STATE,
  NETWORK_FAILURE,
  SLOW_LATENCY,
} from "example-shared/world/constants/world";
import type { HarborCredential } from "example-shared/world/types/HarborCredential";
import type { IssuedToken } from "example-shared/world/types/IssuedToken";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";
import type { WorkspaceAnswer } from "example-shared/world/types/WorkspaceAnswer";
import type { WorldState } from "example-shared/world/types/WorldState";

type SessionOptions = {
  provider: string;
  person: PersonId;
  organization: OrganizationId | null;
};

type SessionChanges = Partial<Pick<ServerSession, "organization" | "action">>;

const UNAUTHORIZED_ANSWER: WorkspaceAnswer = { status: "unauthorized" };

/**
 * The one in-page world every simulated SDK acts on: the people and their
 * names, each provider's server sessions, what this browser holds for each
 * provider, the tokens Harbor's API accepts, the network and the provider's
 * speed. It counts every call into a provider SDK.
 */
export const createLabWorld = () => {
  const state = createValueStore<WorldState>(INITIAL_WORLD_STATE);
  const sessions = new Map<string, ServerSession>();
  const held = new Map<string, string>();
  const tokens = new Map<string, IssuedToken>();
  const names = new Map<PersonId, string>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let lastId = 0;

  const getNextId = () => {
    lastId += 1;

    return lastId;
  };

  const wait = (duration: number) => {
    if (duration === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, duration);

      timers.add(timer);
    });
  };

  const getLatency = () => (state.get().slow ? SLOW_LATENCY : 0);

  const reachServer = async (duration: number) => {
    if (!state.get().online) {
      throw new TypeError(NETWORK_FAILURE);
    }

    await wait(duration);
  };

  const getSession = (id: string) => sessions.get(id) ?? null;

  const getHeldSession = (provider: string) => {
    const id = held.get(provider);

    return id === undefined ? null : getSession(id);
  };

  // A cookie names whoever this browser holds now, and a token whoever it was minted for.
  const resolveCredential = (credential: HarborCredential) => {
    if (credential.kind === "token") {
      return tokens.get(credential.value) ?? null;
    }

    const session = getHeldSession(credential.provider.id);

    if (session === null) {
      return null;
    }

    return {
      session: { id: session.id },
      person: session.person,
      organization: session.organization,
    };
  };

  const clearTimers = () => {
    for (const timer of timers) {
      clearTimeout(timer);
    }

    timers.clear();
  };

  return {
    state: { get: state.get, subscribe: state.subscribe },
    setOnline: (online: boolean) => {
      state.set({ ...state.get(), online });
    },
    setSlow: (slow: boolean) => {
      state.set({ ...state.get(), slow });
    },
    countCall: () => {
      state.set({ ...state.get(), calls: state.get().calls + 1 });
    },
    waitForStorage: () => wait(getLatency()),
    waitForSlowStorage: () => wait(SLOW_LATENCY),
    waitForServer: () => reachServer(getLatency()),
    // A refresh always takes three seconds, so a tour or a visitor can act while it runs.
    waitForRefresh: () => reachServer(SLOW_LATENCY),
    openSession: ({ provider, person, organization }: SessionOptions) => {
      const session: ServerSession = {
        id: `${provider}_session_${getNextId()}`,
        provider,
        person,
        organization,
        action: null,
        ended: false,
      };

      sessions.set(session.id, session);

      return session;
    },
    getSession,
    updateSession: (id: string, changes: SessionChanges) => {
      const session = getSession(id);

      if (session === null) {
        return null;
      }

      const updated = { ...session, ...changes };

      sessions.set(id, updated);

      return updated;
    },
    endSession: (id: string) => {
      const session = getSession(id);

      if (session === null) {
        return;
      }

      sessions.set(id, { ...session, ended: true });
    },
    getHeldSession,
    holdSession: (provider: string, session: ServerSession | null) => {
      if (session === null) {
        held.delete(provider);

        return;
      }

      held.set(provider, session.id);
    },
    getName: (person: PersonId) => names.get(person) ?? PEOPLE[person].name,
    setName: (person: PersonId, name: string) => {
      names.set(person, name);
    },
    issueToken: (session: ServerSession, prefix: string) => {
      const value = `${prefix}.${session.id}.${getNextId()}`;

      tokens.set(value, {
        session: { id: session.id },
        person: session.person,
        organization: session.organization,
      });

      return value;
    },
    getWorkspace: async (
      credential: HarborCredential,
      { slowly }: { slowly: boolean },
    ): Promise<WorkspaceAnswer> => {
      const issued = resolveCredential(credential);

      await reachServer(slowly ? SLOW_LATENCY : 0);

      if (issued === null) {
        return UNAUTHORIZED_ANSWER;
      }

      const session = getSession(issued.session.id);

      if (session === null || session.ended) {
        return UNAUTHORIZED_ANSWER;
      }

      const organization =
        issued.organization ?? PEOPLE[issued.person].organization;

      return {
        status: "ok",
        person: issued.person,
        organization: ORGANIZATIONS[organization],
        projects: PROJECTS[organization][issued.person],
      };
    },
    reset: () => {
      clearTimers();
      sessions.clear();
      held.clear();
      tokens.clear();
      names.clear();
      state.set(INITIAL_WORLD_STATE);
    },
    dispose: clearTimers,
  };
};
