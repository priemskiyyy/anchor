import { Anchor, AnchorError } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  ObservableValue,
} from "@priemskiyyy/anchor";

import { describeDiagnosticEvent } from "example-shared/formatting/describeDiagnosticEvent";
import { describeSessionChange } from "example-shared/formatting/describeSessionChange";
import { formatErrorCode } from "example-shared/formatting/formatErrorCode";
import { createHarborApp } from "example-shared/harbor/createHarborApp";
import { ABSENT_DEVTOOLS } from "example-shared/lab/constants/devtools";
import {
  TIMELINE_LENGTH,
  NOTICES_LENGTH,
} from "example-shared/lab/constants/logs";
import { MISBEHAVIORS } from "example-shared/lab/constants/misbehaviors";
import { TOURS } from "example-shared/lab/constants/tours";
import { getMisbehaviorAvailability } from "example-shared/lab/getMisbehaviorAvailability";
import { getSessionSummary } from "example-shared/lab/getSessionSummary";
import { isMisbehaviorOn } from "example-shared/lab/isMisbehaviorOn";
import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { LabNotice } from "example-shared/lab/types/LabNotice";
import type { SessionChange } from "example-shared/lab/types/SessionChange";
import type { SessionLabOptions } from "example-shared/lab/types/SessionLabOptions";
import type { SessionSummary } from "example-shared/lab/types/SessionSummary";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import type { TourActions } from "example-shared/lab/types/TourActions";
import type { TourState } from "example-shared/lab/types/TourState";
import type { TourStep } from "example-shared/lab/types/TourStep";
import { PROVIDER_CATALOG } from "example-shared/providers/constants/catalog";
import type { LabAnchor } from "example-shared/providers/types/LabAnchor";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";
import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import { TIMELINE_TONES } from "example-shared/ui/constants/tones";
import { createEventLog } from "example-shared/utils/createEventLog";
import { createValueStore } from "example-shared/utils/createValueStore";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { PEOPLE } from "example-shared/world/constants/people";
import { createLabWorld } from "example-shared/world/createLabWorld";

type MisbehaviorAction = (current: LabRuntime) => Promise<void>;

const getReadOnly = <T>({ get, subscribe }: ObservableValue<T>) => ({
  get,
  subscribe,
});

/**
 * The Session Lab: Harbor over one provider of the catalog at a time, each a
 * real adapter over a simulated SDK acting on one in-page world. It keeps one
 * timeline across every Anchor it starts, says why each key changed, makes
 * the provider misbehave on request, and runs the tours.
 */
export const createSessionLab = ({
  hints = [],
  catalog = PROVIDER_CATALOG,
  provider: initialProvider,
  devtools = ABSENT_DEVTOOLS,
}: SessionLabOptions = {}) => {
  const world = createLabWorld();
  const timeline = createEventLog<TimelineEntry>(TIMELINE_LENGTH);
  const notices = createValueStore<LabNotice[]>([]);
  const sessionChange = createValueStore<SessionChange | null>(null);
  const misbehaving = createValueStore<MisbehaviorId | null>(null);
  const tour = createValueStore<TourState | null>(null);
  let lastId = 0;
  let lastSummary: SessionSummary | null = null;

  let stopRuntime = () => {};

  let tourRun = 0;
  let tourStart = 0;
  let tourSteps: TourStep[] = [];

  const getNextId = () => {
    lastId += 1;

    return lastId;
  };

  const getProvider = (id: string | undefined) => {
    const found = catalog.find((provider) => provider.id === id);

    if (found === undefined) {
      throw new TypeError(`The catalog lists no provider named ${String(id)}.`);
    }

    return found;
  };

  const addNotice = (notice: Omit<LabNotice, "id">) => {
    notices.set(
      [{ ...notice, id: getNextId() }, ...notices.get()].slice(
        0,
        NOTICES_LENGTH,
      ),
    );
  };

  const createRuntime = (provider: LabProvider): LabRuntime => {
    const simulated = provider.create({ world, sync: () => anchor.sync() });

    const anchor: LabAnchor = new Anchor<LabUser, unknown, LabTokenProfile>({
      adapter: simulated.adapter,
      hints,
    });

    return { id: getNextId(), provider, simulated, anchor };
  };

  const runtime = createValueStore<LabRuntime>(
    createRuntime(getProvider(initialProvider ?? catalog[0]?.id)),
  );

  const harbor = createHarborApp({
    world,
    getRuntime: runtime.get,
    onResult: ({ session, line, tone }) => {
      const { provider } = runtime.get();

      timeline.add({
        id: getNextId(),
        timestamp: Date.now(),
        type: null,
        session,
        provider: { id: provider.id, label: provider.label },
        line,
        tone,
      });
    },
  });

  const recordSessionChange = (current: LabRuntime) => {
    if (runtime.get() !== current) {
      return;
    }

    const state = current.anchor.session.get();
    const summary = getSessionSummary(current, state, world);
    const change = describeSessionChange(lastSummary, summary);

    lastSummary = summary;
    harbor.handleSessionState(state);

    if (change === null) {
      return;
    }

    sessionChange.set({ ...change, id: getNextId() });
  };

  const startRuntime = (current: LabRuntime) => {
    const { provider, anchor } = current;

    const stops = [
      anchor.diagnostics.events.subscribe((event) => {
        timeline.add({
          id: getNextId(),
          timestamp: event.timestamp,
          type: event.type,
          session: event.session,
          provider: { id: provider.id, label: provider.label },
          line: describeDiagnosticEvent(event, provider),
          tone: TIMELINE_TONES[event.type],
        });
      }),
      anchor.session.subscribe(() => recordSessionChange(current)),
    ];

    stopRuntime = () => {
      for (const stop of stops) {
        stop();
      }
    };

    return anchor.start().catch((error: unknown) => {
      if (error instanceof AnchorError && error.code === "DISPOSED") {
        return;
      }

      addNotice({
        title: "Harbor could not start",
        body: `Anchor answered ${formatErrorCode(error)}.`,
        tone: "danger",
        misbehavior: null,
      });
    });
  };

  // The disposal is recorded before the timeline stops listening.
  const stopCurrentRuntime = () => {
    runtime.get().anchor.dispose();
    stopRuntime();
    harbor.handleRuntimeChange();
  };

  const startProvider = (provider: LabProvider) => {
    const next = createRuntime(provider);

    runtime.set(next);

    return startRuntime(next);
  };

  const started = startRuntime(runtime.get());
  let tourProvider = runtime.get().provider;

  const reload = () => {
    stopCurrentRuntime();

    return startProvider(runtime.get().provider);
  };

  // The same person signs in with the next provider, so switching changes the adapter and nothing Harbor shows.
  const carrySession = (from: LabProvider, to: LabProvider) => {
    const held = world.getHeldSession(from.id);

    if (held === null || held.ended) {
      world.holdSession(to.id, null);

      return;
    }

    world.holdSession(
      to.id,
      world.openSession({
        provider: to.id,
        person: held.person,
        organization: to.capabilities.organizations
          ? (held.organization ?? PEOPLE[held.person].organization)
          : null,
      }),
    );
  };

  const selectProvider = (id: string) => {
    const { provider } = runtime.get();
    const next = getProvider(id);

    if (next === provider) {
      return Promise.resolve();
    }

    carrySession(provider, next);
    stopCurrentRuntime();
    // What a misbehavior did belongs to the provider it ran on.
    notices.set([]);

    return startProvider(next);
  };

  const endTour = () => {
    tourRun += 1;
    tourSteps = [];
    tour.set(null);
  };

  const reset = () => {
    endTour();
    stopCurrentRuntime();
    world.reset();
    timeline.log.clear();
    notices.set([]);
    sessionChange.set(null);
    misbehaving.set(null);
    lastSummary = null;
    harbor.reset();

    return startProvider(runtime.get().provider);
  };

  const getCurrentSession = () =>
    getAcceptedSession(runtime.get().anchor.session.get());

  const signOutCurrentSession = async () => {
    const session = getCurrentSession();

    if (session === null) {
      return;
    }

    await harbor.signOut(session);
  };

  const runKnob = async (current: LabRuntime, id: MisbehaviorId) => {
    const knob = current.simulated.misbehaviors[id];

    if (knob === undefined) {
      throw new TypeError(`${current.provider.label} has no knob for ${id}.`);
    }

    await knob();
  };

  const performMisbehavior = {
    "other-tab": (current) => runKnob(current, "other-tab"),
    "server-end": async ({ provider }) => {
      const held = world.getHeldSession(provider.id);

      if (held === null) {
        return;
      }

      world.endSession(held.id);
    },
    offline: async () => {
      world.setOnline(!world.state.get().online);
    },
    slow: async () => {
      world.setSlow(!world.state.get().slow);
    },
    "duplicate-event": (current) => runKnob(current, "duplicate-event"),
    "stale-callback": (current) => runKnob(current, "stale-callback"),
    "two-factor": (current) => runKnob(current, "two-factor"),
    "partial-end": async (current) => {
      await runKnob(current, "partial-end");
      await signOutCurrentSession();
    },
  } satisfies Record<MisbehaviorId, MisbehaviorAction>;

  const misbehave = async (id: MisbehaviorId) => {
    const current = runtime.get();
    const behavior = current.provider.behaviors[id];
    const misbehavior = MISBEHAVIORS.find((candidate) => candidate.id === id);

    if (
      !behavior.available ||
      misbehavior === undefined ||
      misbehaving.get() !== null ||
      !getMisbehaviorAvailability(
        misbehavior,
        current.provider,
        current.anchor.session.get().status,
      ).available
    ) {
      return;
    }

    const switchingOff = isMisbehaviorOn(id, world.state.get());

    misbehaving.set(id);

    try {
      await performMisbehavior[id](current);

      if (switchingOff || runtime.get() !== current) {
        return;
      }

      addNotice({
        title: misbehavior.guarantee,
        body: behavior.outcome,
        tone: "positive",
        misbehavior: id,
      });
    } catch (error) {
      addNotice({
        title: `${misbehavior.label} did not finish`,
        body: `The provider answered ${formatErrorCode(error)}.`,
        tone: "danger",
        misbehavior: id,
      });
    } finally {
      misbehaving.set(null);
    }
  };

  const sources: ObservableValue<unknown>[] = [
    harbor.view,
    runtime,
    timeline.log,
  ];

  const waitUntil = (isDone: () => boolean) =>
    new Promise<void>((resolve) => {
      if (isDone()) {
        resolve();

        return;
      }

      const stops = sources.map((source) =>
        source.subscribe(() => {
          if (!isDone()) {
            return;
          }

          for (const stop of stops) {
            stop();
          }

          resolve();
        }),
      );
    });

  const hasSettledProjects = () => {
    const state = runtime.get().anchor.session.get();

    if (state.status === "action-required" || state.status === "unavailable") {
      return true;
    }

    if (state.status !== "signed-in") {
      return false;
    }

    const workspace = harbor.view.get().workspaces[state.session.key];

    return workspace !== undefined && workspace.status !== "loading";
  };

  const hasNoLoads = () =>
    Object.values(harbor.view.get().workspaces).every(
      ({ status }) => status !== "loading",
    );

  const hasEventSinceTourStart = (types: AnchorDiagnosticType[]) =>
    timeline.log
      .get()
      .some(
        ({ id, type }) =>
          id > tourStart && type !== null && types.includes(type),
      );

  const tourActions: TourActions = {
    signIn: harbor.signIn,
    signOut: signOutCurrentSession,
    switchOrganization: harbor.switchOrganization,
    rename: async () => {
      const session = getCurrentSession();

      if (session === null) {
        return;
      }

      await harbor.rename(session);
    },
    startLoadingProjects: ({ slowly }) => {
      const session = getCurrentSession();

      if (session === null) {
        return;
      }

      harbor.loadProjects(session, { slowly });
    },
    loadProjects: async ({ slowly }) => {
      const session = getCurrentSession();

      if (session === null) {
        return;
      }

      await harbor.loadProjects(session, { slowly });
    },
    retry: harbor.retry,
    reload,
    selectProvider,
    setOnline: world.setOnline,
    misbehave,
    waitForEvent: (types) => waitUntil(() => hasEventSinceTourStart(types)),
    waitForProjects: () => waitUntil(hasSettledProjects),
    waitForLoads: () => waitUntil(hasNoLoads),
    devtools,
  };

  const updateTour = (changes: Partial<TourState>) => {
    const state = tour.get();

    if (state === null) {
      return;
    }

    tour.set({ ...state, ...changes });
  };

  const performStep = async (index: number, provider: LabProvider) => {
    const step = tourSteps[index];

    if (step === undefined) {
      return;
    }

    const run = tourRun;

    updateTour({ index, performed: index, status: "running", failure: null });

    try {
      await step.perform(tourActions, provider);

      if (run !== tourRun) {
        return;
      }

      updateTour({ status: "ready" });
    } catch (error) {
      if (run !== tourRun) {
        return;
      }

      updateTour({
        status: "failed",
        failure: `This step could not finish: ${formatErrorCode(error)}.`,
      });
    }
  };

  const startTour = async (id: string) => {
    const definition = TOURS.find((candidate) => candidate.id === id);

    if (definition === undefined) {
      return;
    }

    await reset();

    const { provider } = runtime.get();

    // A tour's words and skips stay those of the provider it started over.
    tourProvider = provider;
    tourRun += 1;
    tourStart = lastId;
    tourSteps = definition.steps.flatMap((step) =>
      step.isSkipped?.(provider) === true ? [] : [step],
    );
    tour.set({
      tour: { id: definition.id, title: definition.title },
      steps: tourSteps.map(({ title, body, highlights }) => ({
        title,
        body: body(provider),
        highlights,
      })),
      index: 0,
      performed: -1,
      status: "ready",
      failure: null,
    });
    await performStep(0, provider);
  };

  return {
    catalog,
    tours: TOURS,
    started,
    world: world.state,
    runtime: getReadOnly(runtime),
    timeline: timeline.log,
    notices: getReadOnly(notices),
    sessionChange: getReadOnly(sessionChange),
    misbehaving: getReadOnly(misbehaving),
    tour: getReadOnly(tour),
    harbor: {
      view: harbor.view,
      signIn: harbor.signIn,
      signOut: harbor.signOut,
      switchOrganization: harbor.switchOrganization,
      rename: harbor.rename,
      completeAction: harbor.completeAction,
      retry: harbor.retry,
      loadProjects: harbor.loadProjects,
      openLogoutPage: harbor.openLogoutPage,
    },
    selectProvider,
    reload,
    reset,
    misbehave,
    dismissNotice: (id: number) => {
      notices.set(
        notices.get().flatMap((notice) => (notice.id === id ? [] : [notice])),
      );
    },
    startTour,
    goToNextStep: () => {
      const state = tour.get();

      if (state === null || state.status === "running") {
        return;
      }

      const next = state.index + 1;

      if (next >= state.steps.length) {
        endTour();

        return;
      }

      if (next <= state.performed) {
        tour.set({ ...state, index: next });

        return;
      }

      performStep(next, tourProvider);
    },
    goToPreviousStep: () => {
      const state = tour.get();

      if (state === null || state.status === "running" || state.index === 0) {
        return;
      }

      tour.set({ ...state, index: state.index - 1 });
    },
    endTour,
    dispose: () => {
      endTour();
      stopCurrentRuntime();
      world.dispose();
    },
  };
};
