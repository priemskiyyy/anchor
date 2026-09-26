import { Anchor } from "@priemskiyyy/anchor";
import type { EndStep, SessionState } from "@priemskiyyy/anchor";
import { afterEach, expect, test } from "vitest";

import { PROVIDER_CATALOG } from "example-shared/providers/constants/catalog";
import type { LabAdapter } from "example-shared/providers/types/LabAdapter";
import type { LabAnchor } from "example-shared/providers/types/LabAnchor";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";
import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import { createLabWorld } from "example-shared/world/createLabWorld";
import type { HarborCredential } from "example-shared/world/types/HarborCredential";

const disposals: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposals.splice(0)) {
    dispose();
  }
});

// Resolves once every promise callback queued so far has run.
const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const startProvider = async (
  provider: LabProvider,
  wrapAdapter: (adapter: LabAdapter) => LabAdapter = (adapter) => adapter,
) => {
  const world = createLabWorld();
  const anchors: LabAnchor[] = [];

  const simulated = provider.create({
    world,
    sync: () => anchors[0]?.sync() ?? Promise.resolve(),
  });

  const anchor: LabAnchor = new Anchor<LabUser, unknown, LabTokenProfile>({
    adapter: wrapAdapter(simulated.adapter),
  });

  anchors.push(anchor);
  disposals.push(anchor.dispose, world.dispose);
  await anchor.start();

  return { world, simulated, anchor };
};

// What each provider's sign-out proves remotely, as its adapter's README says.
const REMOTE_STEPS: Partial<Record<string, EndStep>> = {
  firebase: "not-applicable",
  supabase: "completed",
  auth0: "unknown",
  "better-auth": "completed",
  oidc: "unknown",
  keycloak: "unknown",
  okta: "unknown",
  msal: "unknown",
  amplify: "unknown",
  clerk: "completed",
  workos: "unknown",
  http: "completed",
};

// The misbehaviors a simulated SDK performs itself; the world performs the others for every provider.
const SDK_MISBEHAVIORS: MisbehaviorId[] = [
  "duplicate-event",
  "other-tab",
  "partial-end",
  "stale-callback",
  "two-factor",
];

const getSignedInSession = (state: SessionState<LabUser, LabTokenProfile>) => {
  if (state.status !== "signed-in") {
    throw new Error(
      `Expected a signed-in session, the state is ${state.status}.`,
    );
  }

  return state.session;
};

test("the catalog lists twelve providers under ids and labels of their own", () => {
  expect(PROVIDER_CATALOG.map(({ id, label }) => [id, label])).toEqual([
    ["firebase", "Firebase"],
    ["supabase", "Supabase"],
    ["auth0", "Auth0"],
    ["better-auth", "Better Auth"],
    ["oidc", "OIDC"],
    ["keycloak", "Keycloak"],
    ["okta", "Okta"],
    ["msal", "MSAL"],
    ["amplify", "Amplify"],
    ["clerk", "Clerk"],
    ["workos", "WorkOS"],
    ["http", "Your backend"],
  ]);
});

for (const provider of PROVIDER_CATALOG) {
  test(`${provider.label} starts signed out, signs Ada in, replaces her with Grace under a new key, pays Harbor's API with its credential, and ends the session`, async () => {
    const { world, simulated, anchor } = await startProvider(provider);

    expect(anchor.session.get()).toEqual({ status: "signed-out" });

    await simulated.signIn("ada", "harbor");
    await flushPromises();

    const ada = getSignedInSession(anchor.session.get());

    expect(ada.user).toEqual({
      name: "Ada Moreau",
      email: "ada@harbor.example",
    });

    await simulated.signIn("grace", "summit");
    await flushPromises();

    const grace = getSignedInSession(anchor.session.get());

    expect(grace.user.name).toBe("Grace Okafor");
    expect(grace.principal.subject).not.toBe(ada.principal.subject);
    expect(grace.principal.authority).toBe(ada.principal.authority);
    expect(grace.key).not.toBe(ada.key);

    const credential: HarborCredential =
      provider.capabilities.credential === "cookie"
        ? { kind: "cookie", provider: { id: provider.id } }
        : { kind: "token", value: (await grace.getToken("api")).value };

    await expect(
      world.getWorkspace(credential, { slowly: false }),
    ).resolves.toMatchObject({ status: "ok", person: "grace" });

    const result = await grace.end();

    await flushPromises();

    expect(result.local).toBe("completed");
    expect(result.remote).toBe(REMOTE_STEPS[provider.id]);
    expect(result.navigation === null).toBe(!provider.capabilities.navigation);
    expect(anchor.session.get()).toEqual({ status: "signed-out" });

    // A new page reads what this browser still holds after the ending: nobody.
    const reloaded = new Anchor<LabUser, unknown, LabTokenProfile>({
      adapter: provider.create({ world, sync: () => Promise.resolve() })
        .adapter,
    });

    disposals.push(reloaded.dispose);
    await reloaded.start();

    expect(reloaded.session.get()).toEqual({ status: "signed-out" });
  });
}

for (const provider of PROVIDER_CATALOG) {
  test(`${provider.label} has a knob for exactly the SDK misbehaviors it says it can do, an organization switch exactly when its sessions name one, and a step to finish exactly when it can block a session`, () => {
    const world = createLabWorld();

    disposals.push(world.dispose);

    const simulated = provider.create({ world, sync: () => Promise.resolve() });

    expect(Object.keys(simulated.misbehaviors).sort()).toEqual(
      SDK_MISBEHAVIORS.filter((id) => provider.behaviors[id].available),
    );
    expect(simulated.switchOrganization !== null).toBe(
      provider.capabilities.organizations,
    );
    expect(simulated.completeAction !== null).toBe(
      provider.behaviors["two-factor"].available,
    );
  });
}

for (const provider of PROVIDER_CATALOG.filter(
  ({ behaviors }) => behaviors["duplicate-event"].available,
)) {
  test(`${provider.label}'s duplicate event really reaches Anchor, which publishes nothing and keeps the key`, async () => {
    const reports: string[] = [];

    // Hears every report the adapter makes, so a duplicate that arrived differs from one never sent.
    const { simulated, anchor } = await startProvider(provider, (adapter) => ({
      ...adapter,
      open: (observer) =>
        adapter.open({
          session: (answer) => {
            reports.push(answer.status);
            observer.session(answer);
          },
          invalidate: () => {
            reports.push("invalidate");
            observer.invalidate();
          },
        }),
    }));

    await simulated.signIn("ada", "harbor");
    await flushPromises();

    const before = anchor.session.get();
    const reported = reports.length;

    await simulated.misbehaviors["duplicate-event"]?.();
    await flushPromises();

    expect(reports.length).toBeGreaterThan(reported);
    expect(anchor.session.get()).toBe(before);
  });
}

test("every outcome and reason a provider shows is a written sentence on one line", () => {
  const sentences = PROVIDER_CATALOG.flatMap(({ behaviors }) =>
    Object.values(behaviors).map((behavior) =>
      behavior.available ? behavior.outcome : behavior.reason,
    ),
  );

  expect(sentences).toHaveLength(PROVIDER_CATALOG.length * 8);

  for (const sentence of sentences) {
    expect(sentence).toMatch(/^[A-Za-z][^\n]*[.]$/);
  }
});
