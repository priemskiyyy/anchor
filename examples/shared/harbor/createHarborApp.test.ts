import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { PROVIDER_CATALOG } from "example-shared/providers/constants/catalog";
import { KEYCLOAK_PROVIDER } from "example-shared/providers/constants/keycloakProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { SLOW_LATENCY } from "example-shared/world/constants/world";
import type { LabWorld } from "example-shared/world/types/LabWorld";

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

const startLab = async (
  provider: string,
  catalog: LabProvider[] = PROVIDER_CATALOG,
) => {
  const lab = createSessionLab({ provider, catalog });

  labs.push(lab);
  await lab.started;
  await settle();

  return lab;
};

const getSession = (lab: SessionLab) =>
  getAcceptedSession(lab.runtime.get().anchor.session.get());

const getWorkspace = (lab: SessionLab, key: string | undefined) =>
  key === undefined ? undefined : lab.harbor.view.get().workspaces[key];

test("a project list that lands after its session was replaced stays under its own key, and Harbor says so in the timeline", async () => {
  const lab = await startLab("better-auth");

  await lab.harbor.signIn("ada");
  await settle();

  const ada = getSession(lab);

  if (ada === null) {
    throw new Error("Expected Ada to be signed in.");
  }

  const loading = lab.harbor.loadProjects(ada, { slowly: true });

  await lab.harbor.signIn("grace");
  await settle();
  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);
  await loading;

  expect(getWorkspace(lab, ada.key)).toMatchObject({
    status: "ready",
    person: "ada",
  });
  expect(getWorkspace(lab, getSession(lab)?.key)).toMatchObject({
    status: "ready",
    person: "grace",
  });
  expect(lab.timeline.get()[0]?.line).toBe(
    `Harbor's API answered for key ${ada.key.slice(0, 8)} after that session was gone, so the list stays under its own key.`,
  );
});

test("a sign-in that never reached the provider says the sign-in service cannot be reached, and the next one clears it", async () => {
  const lab = await startLab("supabase");

  await lab.misbehave("offline");
  await lab.harbor.signIn("ada");

  expect(lab.harbor.view.get()).toMatchObject({
    busy: null,
    notice: "We can't reach the sign-in service. Try again.",
  });

  await lab.misbehave("offline");
  await lab.harbor.signIn("ada");
  await settle();

  expect(lab.harbor.view.get().notice).toBe(null);
  expect(getSession(lab)?.user.name).toBe("Ada Moreau");
});

test("signing out keeps what the ending proved, and opening the logout page ends the provider's own session", async () => {
  const worlds: LabWorld[] = [];

  // Keycloak as the catalog lists it, handing the test the world it acts on.
  const keycloak: LabProvider = {
    ...KEYCLOAK_PROVIDER,
    create: (context) => {
      worlds.push(context.world);

      return KEYCLOAK_PROVIDER.create(context);
    },
  };

  const lab = await startLab("keycloak", [keycloak]);

  await lab.harbor.signIn("ada");
  await settle();

  const session = getSession(lab);

  if (session === null) {
    throw new Error("Expected Ada to be signed in.");
  }

  await lab.harbor.signOut(session);
  await settle();

  const ended = lab.harbor.view.get().ended;

  expect(ended).toMatchObject({
    result: { local: "completed", remote: "unknown" },
    provider: { label: "Keycloak" },
    opened: false,
  });
  expect(ended?.result.navigation?.url).toBe(
    `https://sso.harbor.example/realms/harbor/protocol/openid-connect/logout?client_id=harbor-web&post_logout_redirect_uri=https%3A%2F%2Fharbor.example&id_token_hint=keycloak-id-token.${ended?.server?.id}`,
  );

  const server = ended?.server?.id ?? "";

  expect(worlds[0]?.getSession(server)?.ended).toBe(false);

  lab.harbor.openLogoutPage();

  expect(lab.harbor.view.get().ended?.opened).toBe(true);
  expect(worlds[0]?.getSession(server)?.ended).toBe(true);
});

test("a sign-out the provider refuses keeps the person signed in and says why", async () => {
  const lab = await startLab("okta");

  await lab.harbor.signIn("ada");
  await settle();

  const session = getSession(lab);

  if (session === null) {
    throw new Error("Expected Ada to be signed in.");
  }

  await lab.misbehave("offline");
  await lab.harbor.signOut(session);
  await settle();

  expect(lab.harbor.view.get().notice).toBe(
    "Harbor could not sign you out (END_FAILED): you are still signed in.",
  );
  expect(getSession(lab)?.key).toBe(session.key);
});

test("a token the adapter refuses while Anchor still shows its session makes Harbor read again, so the silent change reaches the screen", async () => {
  const lab = await startLab("http");

  await lab.harbor.signIn("ada");
  await settle();

  const ada = getSession(lab);

  await lab.misbehave("other-tab");
  await settle();

  expect(getSession(lab)).toBe(ada);

  if (ada === null) {
    throw new Error("Expected Ada to be signed in.");
  }

  await lab.harbor.loadProjects(ada, { slowly: false });
  await settle();

  expect(getSession(lab)?.user.name).toBe("Grace Okafor");
  expect(getWorkspace(lab, ada.key)).toEqual({
    status: "failed",
    message:
      "The session changed before the token arrived, so Harbor dropped this request.",
  });
});

test("the projects of a new session load once, with a token where the provider mints them and the cookie where it does not", async () => {
  const token = await startLab("oidc");
  const cookie = await startLab("better-auth");

  for (const lab of [token, cookie]) {
    await lab.harbor.signIn("grace");
    await settle();
  }

  expect(
    [token, cookie].map((lab) => getWorkspace(lab, getSession(lab)?.key)),
  ).toEqual([
    expect.objectContaining({ status: "ready", credential: "token" }),
    expect.objectContaining({ status: "ready", credential: "cookie" }),
  ]);
  expect(
    token.timeline.get().filter(({ type }) => type === "token requested"),
  ).toHaveLength(1);
});
