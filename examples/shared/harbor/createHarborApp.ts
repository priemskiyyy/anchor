import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";

import { describeSignOutFailure } from "example-shared/formatting/describeSignOutFailure";
import { describeWorkspaceFailure } from "example-shared/formatting/describeWorkspaceFailure";
import { formatShortKey } from "example-shared/formatting/formatShortKey";
import { INITIAL_HARBOR_VIEW } from "example-shared/harbor/constants/harbor";
import {
  ACTION_FAILED_MESSAGE,
  ORGANIZATION_FAILED_MESSAGE,
  RENAME_FAILED_MESSAGE,
  RETRY_FAILED_MESSAGE,
  SESSION_ENDED_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
} from "example-shared/harbor/constants/messages";
import type { HarborResult } from "example-shared/harbor/types/HarborResult";
import type { HarborTask } from "example-shared/harbor/types/HarborTask";
import type { HarborView } from "example-shared/harbor/types/HarborView";
import type { WorkspaceView } from "example-shared/harbor/types/WorkspaceView";
import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { LabAnchor } from "example-shared/providers/types/LabAnchor";
import type { LabSession } from "example-shared/providers/types/LabSession";
import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";
import { createValueStore } from "example-shared/utils/createValueStore";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { HarborCredential } from "example-shared/world/types/HarborCredential";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

type HarborOptions = {
  world: LabWorld;
  getRuntime: () => LabRuntime;
  /** Hears what Harbor's own calls got back, such as a token request that rejected. */
  onResult: (result: HarborResult) => void;
};

type HarborWork = (runtime: LabRuntime) => Promise<Partial<HarborView>>;

// A read Harbor asks for in the background: its failure is already in Anchor's diagnostics.
const readAgain = (anchor: LabAnchor) => {
  anchor.sync().catch(() => {});
};

const getCredential = async (
  session: LabSession,
  { provider }: LabRuntime,
  slowly: boolean,
): Promise<HarborCredential> => {
  if (provider.capabilities.credential === "cookie") {
    return { kind: "cookie", provider: { id: provider.id } };
  }

  const token = await session.getToken("api", { forceRefresh: slowly });

  return { kind: "token", value: token.value };
};

// A token that could not be minted, or one refused while Anchor still shows its session, is a reason to ask the provider again.
const isReasonToReadAgain = (
  error: unknown,
  anchor: LabAnchor,
  key: string,
) => {
  if (!(error instanceof AnchorError)) {
    return false;
  }

  if (error.code === "TOKEN_FAILED") {
    return true;
  }

  return (
    error.code === "SESSION_CHANGED" &&
    getAcceptedSession(anchor.session.get())?.key === key
  );
};

/**
 * Harbor's own data layer, the same in every framework: it calls the
 * provider's sign-in, `session.getToken()` and `session.end()`, and keeps each
 * session's projects under its `session.key`, so a late answer for one session
 * can never show under another.
 */
export const createHarborApp = ({
  world,
  getRuntime,
  onResult,
}: HarborOptions) => {
  const view = createValueStore<HarborView>(INITIAL_HARBOR_VIEW);

  const updateView = (changes: Partial<HarborView>) => {
    view.set({ ...view.get(), ...changes });
  };

  const setWorkspace = (key: string, workspace: WorkspaceView) => {
    updateView({ workspaces: { ...view.get().workspaces, [key]: workspace } });
  };

  // Each task belongs to the runtime it started on: after a reload, a reset or a switch its answer changes nothing.
  const runTask = async (
    task: HarborTask,
    work: HarborWork,
    getFailure: (error: unknown) => string,
  ) => {
    const runtime = getRuntime();

    updateView({ busy: task, notice: null });

    try {
      const changes = await work(runtime);

      if (getRuntime() !== runtime) {
        return;
      }

      updateView({ ...changes, busy: null });
    } catch (error) {
      if (getRuntime() !== runtime) {
        return;
      }

      updateView({ busy: null, notice: getFailure(error) });
    }
  };

  const loadProjects = async (
    session: LabSession,
    { slowly }: { slowly: boolean },
  ) => {
    const runtime = getRuntime();
    const { key } = session;

    setWorkspace(key, { status: "loading", slowly });

    try {
      const credential = await getCredential(session, runtime, slowly);

      const answer = await world.getWorkspace(credential, {
        slowly: slowly && credential.kind === "cookie",
      });

      if (answer.status === "unauthorized") {
        setWorkspace(key, { status: "failed", message: SESSION_ENDED_MESSAGE });
        onResult({
          session: { key },
          line: `Harbor's API refused the credential of key ${formatShortKey(key)}: the server ended that session.`,
          tone: "warning",
        });
        readAgain(runtime.anchor);

        return;
      }

      // An answer that lands after its session was replaced stays under its own key.
      if (getAcceptedSession(runtime.anchor.session.get())?.key !== key) {
        onResult({
          session: { key },
          line: `Harbor's API answered for key ${formatShortKey(key)} after that session was gone, so the list stays under its own key.`,
          tone: "warning",
        });
      }

      setWorkspace(key, {
        status: "ready",
        person: answer.person,
        organization: answer.organization,
        projects: answer.projects,
        credential: credential.kind,
      });
    } catch (error) {
      setWorkspace(key, {
        status: "failed",
        message: describeWorkspaceFailure(error, runtime.provider),
      });
      onResult({
        session: { key },
        line:
          error instanceof AnchorError
            ? `Harbor's token request for key ${formatShortKey(key)} rejected with ${error.code}.`
            : `Harbor's API could not be reached for key ${formatShortKey(key)}.`,
        tone: "danger",
      });

      if (!isReasonToReadAgain(error, runtime.anchor, key)) {
        return;
      }

      readAgain(runtime.anchor);
    }
  };

  return {
    view: { get: view.get, subscribe: view.subscribe },
    loadProjects,
    signIn: (person: PersonId) =>
      runTask(
        { kind: "sign-in", person },
        async ({ simulated }) => {
          await simulated.signIn(person, PEOPLE[person].organization);

          return { ended: null };
        },
        () => SIGN_IN_FAILED_MESSAGE,
      ),
    signOut: (session: LabSession) =>
      runTask(
        { kind: "sign-out" },
        async ({ provider }) => {
          const held = world.getHeldSession(provider.id);
          const result = await session.end();

          return {
            ended: {
              result,
              provider: { label: provider.label },
              server: held === null ? null : { id: held.id },
              opened: false,
            },
          };
        },
        describeSignOutFailure,
      ),
    switchOrganization: (organization: OrganizationId) =>
      runTask(
        { kind: "organization" },
        async ({ simulated }) => {
          await simulated.switchOrganization?.(organization);

          return {};
        },
        () => ORGANIZATION_FAILED_MESSAGE,
      ),
    rename: (session: LabSession) =>
      runTask(
        { kind: "rename" },
        async ({ simulated }) => {
          const person = getPersonByEmail(session.user.email);

          if (person === null) {
            return {};
          }

          const { name, shortName } = PEOPLE[person];

          await simulated.rename(session.user.name === name ? shortName : name);

          return {};
        },
        () => RENAME_FAILED_MESSAGE,
      ),
    completeAction: () =>
      runTask(
        { kind: "action" },
        async ({ simulated }) => {
          await simulated.completeAction?.();

          return {};
        },
        () => ACTION_FAILED_MESSAGE,
      ),
    retry: () =>
      runTask(
        { kind: "retry" },
        async ({ anchor }) => {
          await anchor.sync();

          return {};
        },
        () => RETRY_FAILED_MESSAGE,
      ),
    // The page a real app would open; here the visit ends the provider's own session.
    openLogoutPage: () => {
      const { ended } = view.get();

      if (ended === null) {
        return;
      }

      if (ended.server !== null) {
        world.endSession(ended.server.id);
      }

      updateView({ ended: { ...ended, opened: true } });
    },
    handleSessionState: (state: SessionState<LabUser, LabTokenProfile>) => {
      if (state.status !== "signed-in") {
        return;
      }

      if (view.get().workspaces[state.session.key] !== undefined) {
        return;
      }

      loadProjects(state.session, { slowly: false });
    },
    handleRuntimeChange: () => {
      updateView({ busy: null, notice: null, ended: null });
    },
    reset: () => {
      view.set(INITIAL_HARBOR_VIEW);
    },
  };
};
