import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { TOURS } from "example-shared/lab/constants/tours";
import { createSessionLab } from "example-shared/lab/createSessionLab";
import type { DevtoolsControls } from "example-shared/lab/types/DevtoolsControls";
import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { PROVIDER_CATALOG } from "example-shared/providers/constants/catalog";
import { MSAL_TENANTS } from "example-shared/providers/msal/constants/msal";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";
import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { SLOW_LATENCY } from "example-shared/world/constants/world";

const labs: SessionLab[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  for (const lab of labs.splice(0)) {
    lab.dispose();
  }

  vi.useRealTimers();
});

// Resolves once every promise callback queued so far has run.
const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const settle = async () => {
  await flushPromises();
  await vi.advanceTimersByTimeAsync(0);
  await flushPromises();
};

const waitForLatency = async () => {
  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);
  await settle();
};

const startLab = async (provider?: string, devtools?: DevtoolsControls) => {
  const lab = createSessionLab({
    ...(provider === undefined ? {} : { provider }),
    ...(devtools === undefined ? {} : { devtools }),
  });

  labs.push(lab);
  await lab.started;
  await settle();

  return lab;
};

const getState = (lab: SessionLab): SessionState<LabUser, LabTokenProfile> =>
  lab.runtime.get().anchor.session.get();

const getSession = (lab: SessionLab) => getAcceptedSession(getState(lab));

const getKey = (lab: SessionLab) => getSession(lab)?.key ?? null;

const signIn = async (lab: SessionLab) => {
  await lab.harbor.signIn("ada");
  await settle();
};

const misbehave = async (lab: SessionLab, id: MisbehaviorId) => {
  const running = lab.misbehave(id);

  await settle();
  await waitForLatency();
  await running;
};

const loadProjects = async (lab: SessionLab, slowly: boolean) => {
  const session = getSession(lab);

  if (session === null) {
    return;
  }

  const loading = lab.harbor.loadProjects(session, { slowly });

  await settle();
  await waitForLatency();
  await loading;
  await settle();
};

const getWorkspaceMessage = (lab: SessionLab) => {
  const session = getSession(lab);

  const workspace =
    session === null
      ? undefined
      : lab.harbor.view.get().workspaces[session.key];

  return workspace?.status === "failed" ? workspace.message : null;
};

const getProvidersWhere = (isIncluded: (provider: LabProvider) => boolean) =>
  PROVIDER_CATALOG.filter(isIncluded);

// Steps a tour to its end, letting the three-second provider answer while a step runs.
const runTourToEnd = async (lab: SessionLab) => {
  const titles: string[] = [];

  for (let turn = 0; turn < 40; turn += 1) {
    await settle();

    const state = lab.tour.get();

    if (state === null) {
      return titles;
    }

    if (state.status === "running") {
      await waitForLatency();

      continue;
    }

    if (state.status === "failed") {
      throw new Error(state.failure ?? "The step failed.");
    }

    titles.push(state.steps[state.index]?.title ?? "");
    lab.goToNextStep();
  }

  throw new Error("The tour did not end.");
};

test("the lab starts Harbor on the catalog's first provider, signed out, and writes its diagnostics as plain sentences, newest first", async () => {
  const lab = await startLab();

  expect(lab.runtime.get().provider.id).toBe("firebase");
  expect(getState(lab)).toEqual({ status: "signed-out" });
  expect(
    lab.timeline
      .get()
      .map(({ type, line }) => [type, line])
      .reverse()
      .slice(0, 2),
  ).toEqual([
    [
      "anchor started",
      "Anchor opened the adapter for Firebase and is reading the session.",
    ],
    ["read started", "Anchor asked Firebase for the session."],
  ]);
});

test("switching the provider carries the signed-in person to the next real adapter under a new key, and disposes the Anchor before it", async () => {
  const lab = await startLab("firebase");

  await signIn(lab);

  const firebase = lab.runtime.get();
  const key = getKey(lab);

  await lab.selectProvider("okta");
  await settle();

  expect(firebase.anchor.diagnostics.get().state).toBe("disposed");
  expect(lab.runtime.get().provider.id).toBe("okta");
  expect(getSession(lab)?.principal).toEqual({
    authority: "https://harbor-lab.okta.com/oauth2/default",
    subject: "00uada7Mr2xKq9Lp5d7",
    tenant: null,
  });
  expect(getKey(lab)).not.toBe(key);
  expect(lab.sessionChange.get()?.reason).toBe(
    "Another provider vouches for this person, so a new key.",
  );
});

test("what a misbehavior did belongs to the provider it ran on, so switching the provider clears its notice", async () => {
  const lab = await startLab("firebase");

  await signIn(lab);
  await misbehave(lab, "duplicate-event");

  expect(lab.notices.get().map(({ misbehavior }) => misbehavior)).toEqual([
    "duplicate-event",
  ]);

  await lab.selectProvider("supabase");
  await settle();

  expect(lab.notices.get()).toEqual([]);
});

test("switching the provider while nobody is signed in hands the next one nobody", async () => {
  const lab = await startLab("auth0");

  await lab.selectProvider("better-auth");
  await settle();

  expect(getState(lab)).toEqual({ status: "signed-out" });
});

test("a reload is a new Anchor over the same provider, which restores the person from what this browser holds", async () => {
  const lab = await startLab("supabase");

  await signIn(lab);

  const before = lab.runtime.get();
  const subject = getSession(lab)?.principal.subject;

  await lab.reload();
  await settle();

  expect(lab.runtime.get().id).not.toBe(before.id);
  expect(getSession(lab)?.principal.subject).toBe(subject);
  expect(lab.sessionChange.get()?.reason).toBe(
    "Harbor started again, and a key is never reused: a new key.",
  );
});

test("a reset forgets the world, the timeline, the notices and the tour, and keeps the provider", async () => {
  const lab = await startLab("http");

  await signIn(lab);
  await misbehave(lab, "two-factor");
  lab.startTour("keys");
  await settle();
  await lab.reset();
  await settle();

  expect(lab.runtime.get().provider.id).toBe("http");
  expect(getState(lab)).toEqual({ status: "signed-out" });
  expect(lab.notices.get()).toEqual([]);
  expect(lab.tour.get()).toBe(null);
  expect(lab.world.get()).toMatchObject({ online: true, slow: false });
  expect(lab.timeline.get().map(({ type }) => type)).not.toContain(
    "session accepted",
  );
});

for (const provider of getProvidersWhere(
  ({ behaviors }) => behaviors["duplicate-event"].available,
)) {
  test(`a duplicate event from ${provider.name} publishes nothing and keeps the key, and its notice names the guarantee`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);

    const state = getState(lab);
    const published: string[] = [];

    const stop = lab.runtime
      .get()
      .anchor.session.subscribe(() => published.push("published"));

    await misbehave(lab, "duplicate-event");
    stop();

    expect(published).toEqual([]);
    expect(getState(lab)).toBe(state);
    expect(lab.notices.get()[0]?.title).toBe(
      "The same session publishes nothing new",
    );
  });
}

// How another tab's sign-in reaches this tab's Anchor, for each provider that has another tab.
const OTHER_TAB: Record<string, string> = {
  firebase: "at once",
  supabase: "at once",
  auth0: "on its next read",
  "better-auth": "at once",
  okta: "at once",
  msal: "at once",
  amplify: "on its next read",
  clerk: "as the sign-out it needs first",
  http: "on its next read",
};

for (const provider of getProvidersWhere(
  ({ behaviors }) => behaviors["other-tab"].available,
)) {
  const reach = OTHER_TAB[provider.id];

  test(`a sign-in in another tab reaches ${provider.name}'s Anchor ${reach}`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);

    const ada = getSession(lab);

    await misbehave(lab, "other-tab");

    if (reach === "at once") {
      expect(getSession(lab)?.user.name).toBe("Grace Okafor");
      expect(getKey(lab)).not.toBe(ada?.key);

      return;
    }

    if (reach === "as the sign-out it needs first") {
      expect(getState(lab)).toEqual({ status: "signed-out" });

      await lab.reload();
      await settle();

      expect(getSession(lab)?.user.name).toBe("Grace Okafor");

      return;
    }

    expect(getSession(lab)).toBe(ada);
    await expect(ada?.getToken("api")).rejects.toMatchObject({
      code: "SESSION_CHANGED",
    });
  });
}

// What each provider does after the server ended the session: Harbor reloads its projects, then loads them with a fresh token.
const AFTER_SERVER_END: Record<string, [string, string | null][]> = {
  firebase: [
    ["signed-in", null],
    [
      "signed-in",
      "Firebase needs you to sign in again before it sends a token.",
    ],
  ],
  supabase: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  auth0: [
    ["signed-in", null],
    ["signed-in", "Auth0 needs you to sign in again before it sends a token."],
  ],
  "better-auth": [["signed-out", null]],
  oidc: [
    ["signed-in", null],
    ["signed-in", "OIDC needs you to sign in again before it sends a token."],
  ],
  keycloak: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  okta: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  msal: [
    ["signed-in", null],
    ["signed-in", "MSAL needs you to sign in again before it sends a token."],
  ],
  amplify: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  clerk: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  workos: [
    ["signed-in", null],
    ["signed-out", null],
  ],
  http: [["signed-out", null]],
};

for (const provider of PROVIDER_CATALOG) {
  test(`a session ${provider.name} ended on the server signs nobody out until ${provider.name} itself says so`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);
    await misbehave(lab, "server-end");

    expect(getState(lab).status).toBe("signed-in");

    const outcomes: [string, string | null][] = [];

    for (const slowly of [false, true]) {
      if (getSession(lab) === null) {
        continue;
      }

      await loadProjects(lab, slowly);

      const message = getWorkspaceMessage(lab);

      outcomes.push([
        getState(lab).status,
        message !== null && message.includes("sign in again") ? message : null,
      ]);
    }

    expect(outcomes).toEqual(AFTER_SERVER_END[provider.id]);
  });
}

for (const provider of PROVIDER_CATALOG) {
  test(`an offline reload over ${provider.name} ${provider.capabilities.offlineStart === "unavailable" ? "is unavailable, never signed out" : "restores the person from its own storage"}`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);
    await misbehave(lab, "offline");
    await lab.reload();
    await settle();

    const state = getState(lab);

    if (provider.capabilities.offlineStart === "unavailable") {
      expect(state).toMatchObject({
        status: "unavailable",
        error: { code: "READ_FAILED" },
      });

      return;
    }

    expect(getAcceptedSession(state)?.user.name).toBe("Ada Moreau");
  });
}

for (const provider of PROVIDER_CATALOG) {
  test(`a slow reload over ${provider.name} is initializing until the provider answers, never signed out or unavailable, and restores the person`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);
    await misbehave(lab, "slow");

    const reloading = lab.reload();
    const { anchor } = lab.runtime.get();
    const statuses = [anchor.session.get().status];

    const stop = anchor.session.subscribe(() =>
      statuses.push(anchor.session.get().status),
    );

    for (let turn = 0; turn < 6; turn += 1) {
      await waitForLatency();
    }

    await reloading;
    stop();

    expect(statuses[0]).toBe("initializing");
    expect(statuses).not.toContain("signed-out");
    expect(statuses).not.toContain("unavailable");
    expect(getSession(lab)?.user.name).toBe("Ada Moreau");
  });
}

test("Amplify refuses a second user, so switching to Grace signs Ada out first, on Amplify's own word", async () => {
  const lab = await startLab("amplify");

  await signIn(lab);

  const { anchor } = lab.runtime.get();
  const statuses: string[] = [];

  const stop = anchor.session.subscribe(() =>
    statuses.push(anchor.session.get().status),
  );

  await lab.harbor.signIn("grace");
  await settle();
  stop();

  expect(statuses).toEqual(["signed-out", "signed-in"]);
  expect(getSession(lab)?.user.name).toBe("Grace Okafor");
});

test("a stale callback from oidc-client-ts answers the person it found first after userLoaded reported the other, and Anchor keeps the newer one", async () => {
  const lab = await startLab("oidc");

  await signIn(lab);

  const events: string[] = [];

  const stop = lab.runtime
    .get()
    .anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  await misbehave(lab, "stale-callback");
  stop();

  expect(getSession(lab)?.user.name).toBe("Grace Okafor");
  expect(events.at(-1)).toBe("read superseded");
  expect(lab.notices.get()[0]?.title).toBe(
    "A late answer never restores an older session",
  );
});

for (const provider of getProvidersWhere(
  ({ behaviors }) => behaviors["two-factor"].available,
)) {
  test(`two-factor on ${provider.name} blocks the session under the same key, refuses its tokens, and the finished step opens it again`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);

    const key = getKey(lab);

    await misbehave(lab, "two-factor");

    expect(getState(lab)).toMatchObject({
      status: "action-required",
      action: { kind: "setup-mfa" },
    });
    expect(getKey(lab)).toBe(key);
    await expect(getSession(lab)?.getToken("api")).rejects.toMatchObject({
      code: "ACTION_REQUIRED",
    });

    await lab.harbor.completeAction();
    await settle();

    expect(getState(lab).status).toBe("signed-in");
    expect(getKey(lab)).toBe(key);
  });
}

for (const provider of PROVIDER_CATALOG) {
  test(`a rename through ${provider.name} reaches Anchor as the same session, under the same key`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);

    const ada = getSession(lab);

    if (ada === null) {
      throw new Error("Expected Ada to be signed in.");
    }

    await lab.harbor.rename(ada);
    await settle();

    expect(getSession(lab)?.user.name).toBe("Ada M.");
    expect(getKey(lab)).toBe(ada.key);
  });
}

for (const provider of getProvidersWhere(
  ({ capabilities }) => capabilities.organizations,
)) {
  test(`switching ${provider.name} to another organization is another security context: a new key, and that organization's projects under it`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);

    const key = getKey(lab);

    await lab.harbor.switchOrganization("summit");
    await settle();

    const switched = getKey(lab);

    expect(switched).not.toBe(key);
    expect(lab.sessionChange.get()?.reason).toBe(
      "Another organization, so a new key.",
    );
    expect(
      switched === null
        ? undefined
        : lab.harbor.view.get().workspaces[switched],
    ).toMatchObject({ status: "ready", organization: { id: "summit" } });
  });
}

test("MSAL's organization is its tenant: Summit Works is the same account in that tenant", async () => {
  const lab = await startLab("msal");

  await signIn(lab);

  const principal = getSession(lab)?.principal;

  await lab.harbor.switchOrganization("summit");
  await settle();

  expect(getSession(lab)?.principal).toEqual({
    ...principal,
    tenant: MSAL_TENANTS.summit,
  });
});

for (const provider of getProvidersWhere(
  ({ behaviors }) => behaviors["partial-end"].available,
)) {
  test(`a partial sign-out over ${provider.name} answers local completed and remote unknown, with no logout page`, async () => {
    const lab = await startLab(provider.id);

    await signIn(lab);
    await misbehave(lab, "partial-end");

    expect(getState(lab)).toEqual({ status: "signed-out" });
    expect(lab.harbor.view.get().ended?.result).toEqual({
      local: "completed",
      remote: "unknown",
      navigation: null,
    });
  });
}

test("a misbehavior the provider cannot do, or one that needs a session nobody holds, runs nothing and says nothing", async () => {
  const lab = await startLab("firebase");
  const signedOut = lab.world.get().calls;

  await misbehave(lab, "duplicate-event");

  expect(lab.world.get().calls).toBe(signedOut);

  await signIn(lab);

  const signedIn = lab.world.get().calls;

  await misbehave(lab, "stale-callback");

  expect(lab.world.get().calls).toBe(signedIn);
  expect(lab.notices.get()).toEqual([]);
});

test("turning a switch on posts the provider's outcome, and turning it off posts nothing", async () => {
  const lab = await startLab("okta");

  await misbehave(lab, "slow");

  expect(lab.world.get().slow).toBe(true);
  expect(lab.notices.get().map(({ title, body }) => [title, body])).toEqual([
    [
      "Work in flight stays with its session",
      "Every auth state update, signing in and renewing now take three seconds. Reload Harbor to watch it restore.",
    ],
  ]);

  await misbehave(lab, "slow");

  expect(lab.world.get().slow).toBe(false);
  expect(lab.notices.get()).toHaveLength(1);
});

for (const provider of PROVIDER_CATALOG) {
  test(`every tour runs to its end over ${provider.name}, through each step its capabilities keep`, async () => {
    const lab = await startLab(provider.id);
    const finished: string[][] = [];

    for (const { id } of TOURS) {
      await lab.selectProvider(provider.id);

      const starting = lab.startTour(id);

      await settle();
      await starting;
      finished.push(await runTourToEnd(lab));
    }

    expect(finished).toEqual(
      TOURS.map(({ steps }) =>
        steps.flatMap((step) =>
          step.isSkipped?.(provider) === true ? [] : [step.title],
        ),
      ),
    );
  });
}

test("the keys tour leaves out its organization step exactly where sessions name no organization, and the ending tour its partial sign-out where there is none", () => {
  const getSkipping = (tourId: string, title: string) =>
    PROVIDER_CATALOG.flatMap((provider) =>
      TOURS.find(({ id }) => id === tourId)
        ?.steps.find((step) => step.title === title)
        ?.isSkipped?.(provider) === true
        ? [provider.id]
        : [],
    );

  expect(getSkipping("keys", "Another organization is a new key")).toEqual([
    "firebase",
    "supabase",
    "okta",
    "amplify",
  ]);
  expect(
    getSkipping("ending", "A partial sign-out says what it could not prove"),
  ).toEqual([
    "firebase",
    "supabase",
    "auth0",
    "better-auth",
    "msal",
    "amplify",
    "workos",
    "http",
  ]);
});

test("the diagnostics tour drives the devtools it was given, once each and in order, and moves no provider call while it does", async () => {
  const driven: string[] = [];

  const lab = await startLab("keycloak", {
    open: () => driven.push("open"),
    showValues: () => driven.push("show values"),
    close: () => driven.push("close"),
  });

  const starting = lab.startTour("diagnostics");

  await settle();
  await starting;

  const calls = lab.world.get().calls;

  await runTourToEnd(lab);

  expect(driven).toEqual(["open", "show values", "close"]);
  expect(lab.world.get().calls).toBe(calls);
});

test("a tour ended while its step still runs changes nothing when that step finishes", async () => {
  const lab = await startLab("firebase");
  const starting = lab.startTour("work");

  await settle();
  await starting;
  lab.goToNextStep();
  await settle();
  lab.goToNextStep();
  await settle();
  lab.goToNextStep();
  await settle();

  expect(lab.tour.get()).toMatchObject({ index: 3, status: "running" });

  lab.endTour();
  await waitForLatency();

  expect(lab.tour.get()).toBe(null);
});

test("a tour started while a step of the one before still runs keeps its own status when that old step finishes", async () => {
  const [first] = PROVIDER_CATALOG;

  if (first === undefined) {
    throw new Error("The catalog lists no provider.");
  }

  const gates: (() => void)[] = [];

  const waitForGate = () =>
    new Promise<void>((resolve) => {
      gates.push(resolve);
    });

  // The first provider, whose sign-ins and renames wait until the test opens their gate.
  const gated: LabProvider = {
    ...first,
    create: (context) => {
      const simulated = first.create(context);

      return {
        ...simulated,
        signIn: async (person, organization) => {
          await waitForGate();
          await simulated.signIn(person, organization);
        },
        rename: async (name) => {
          await waitForGate();
          await simulated.rename(name);
        },
      };
    },
  };

  const lab = createSessionLab({ catalog: [gated] });

  labs.push(lab);
  await lab.started;
  await settle();

  // The old tour's first step waits at the first gate, and the new tour resets the lab under it.
  const oldTour = lab.startTour("keys");

  await settle();

  const newTour = lab.startTour("keys");

  await settle();
  gates[1]?.();
  await settle();
  await newTour;
  lab.goToNextStep();
  await settle();

  expect(lab.tour.get()).toMatchObject({ index: 1, status: "running" });

  gates[0]?.();
  await settle();
  await oldTour;

  expect(lab.tour.get()).toMatchObject({ index: 1, status: "running" });

  gates[2]?.();
  await settle();

  expect(lab.tour.get()).toMatchObject({ index: 1, status: "ready" });
});

test("Back shows the step before without performing it again, and Next moves on without repeating it", async () => {
  const lab = await startLab("http");
  const starting = lab.startTour("keys");

  await settle();
  await starting;
  lab.goToNextStep();
  await settle();

  const renamed = getSession(lab)?.user.name;
  const calls = lab.world.get().calls;

  lab.goToPreviousStep();
  lab.goToNextStep();
  await settle();

  expect(lab.tour.get()).toMatchObject({ index: 1, performed: 1 });
  expect(getSession(lab)?.user.name).toBe(renamed);
  expect(lab.world.get().calls).toBe(calls);
});

test("starting a tour resets the lab first, so every tour begins with nobody signed in", async () => {
  const lab = await startLab("supabase");

  await signIn(lab);

  const starting = lab.startTour("failure");

  await settle();
  await starting;

  expect(lab.tour.get()).toMatchObject({ index: 0, performed: 0 });
  expect(
    lab.timeline
      .get()
      .map(({ type }) => type)
      .reverse()
      .slice(0, 4),
  ).toEqual([
    "anchor started",
    "read started",
    "read completed",
    "session signed out",
  ]);
});

test("a start that fails for any reason but disposal says so in a notice", async () => {
  const [first] = PROVIDER_CATALOG;

  if (first === undefined) {
    throw new Error("The catalog lists no provider.");
  }

  const failing: LabProvider = {
    ...first,
    id: "failing",
    label: "Failing",
    create: (context) => ({
      ...first.create(context),
      adapter: {
        name: "failing",
        native: null,
        tokens: {},
        open: () => {
          throw new AnchorError({
            code: "INVALID_CONFIGURATION",
            message: "The adapter refuses to open.",
          });
        },
      },
    }),
  };

  const lab = createSessionLab({ catalog: [failing] });

  labs.push(lab);
  await lab.started;

  expect(lab.notices.get().map(({ title, body }) => [title, body])).toEqual([
    ["Harbor could not start", "Anchor answered START_FAILED."],
  ]);
});
