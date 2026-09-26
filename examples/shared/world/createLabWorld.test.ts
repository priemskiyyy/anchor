import { afterEach, expect, test, vi } from "vitest";

import {
  NETWORK_FAILURE,
  SLOW_LATENCY,
} from "example-shared/world/constants/world";
import { createLabWorld } from "example-shared/world/createLabWorld";
import type { HarborCredential } from "example-shared/world/types/HarborCredential";
import type { LabWorld } from "example-shared/world/types/LabWorld";

const worlds: LabWorld[] = [];

afterEach(() => {
  for (const world of worlds.splice(0)) {
    world.dispose();
  }

  vi.useRealTimers();
});

const createWorld = () => {
  const world = createLabWorld();

  worlds.push(world);

  return world;
};

const getSettled = async (promise: Promise<unknown>) => {
  const settled: string[] = [];

  promise.then(
    () => settled.push("resolved"),
    (error: unknown) =>
      settled.push(error instanceof Error ? error.message : "rejected"),
  );
  await vi.advanceTimersByTimeAsync(0);

  return settled;
};

test("a request to the provider's server answers at once, waits three seconds while the provider is slow, and rejects offline as fetch does", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  const world = createWorld();

  expect(await getSettled(world.waitForServer())).toEqual(["resolved"]);

  world.setSlow(true);

  const slow = world.waitForServer();

  expect(await getSettled(slow)).toEqual([]);

  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);

  await expect(slow).resolves.toBeUndefined();

  world.setOnline(false);

  expect(await getSettled(world.waitForServer())).toEqual([NETWORK_FAILURE]);
  expect(await getSettled(world.waitForStorage())).toEqual([]);
});

test("a token refresh always takes three seconds, so a tour or a visitor can act while it runs", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  const world = createWorld();
  const refresh = world.waitForRefresh();

  await vi.advanceTimersByTimeAsync(SLOW_LATENCY - 1);

  expect(await getSettled(refresh)).toEqual([]);

  await vi.advanceTimersByTimeAsync(1);

  await expect(refresh).resolves.toBeUndefined();
});

test("Harbor's API answers the person and organization a token was minted for, as they were when it was minted", async () => {
  const world = createWorld();

  const session = world.openSession({
    provider: "auth0",
    person: "ada",
    organization: "harbor",
  });

  const token = world.issueToken(session, "test");

  world.updateSession(session.id, { organization: "summit" });

  await expect(
    world.getWorkspace({ kind: "token", value: token }, { slowly: false }),
  ).resolves.toEqual({
    status: "ok",
    person: "ada",
    organization: { id: "harbor", name: "Harbor Labs" },
    projects: [
      { id: "tide-tables", name: "Tide tables", notes: 12 },
      { id: "mooring-plan", name: "Mooring plan", notes: 5 },
    ],
  });
  await expect(
    world.getWorkspace({ kind: "token", value: "forged" }, { slowly: false }),
  ).resolves.toEqual({ status: "unauthorized" });
});

test("a session without organizations is answered in the person's own organization", async () => {
  const world = createWorld();

  const session = world.openSession({
    provider: "firebase",
    person: "grace",
    organization: null,
  });

  await expect(
    world.getWorkspace(
      { kind: "token", value: world.issueToken(session, "test") },
      { slowly: false },
    ),
  ).resolves.toMatchObject({
    person: "grace",
    organization: { id: "summit" },
  });
});

test("a cookie names whoever this browser held when the request left, and a session ended on the server answers 401", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  const world = createWorld();

  const cookie: HarborCredential = {
    kind: "cookie",
    provider: { id: "better-auth" },
  };

  const ada = world.openSession({
    provider: "better-auth",
    person: "ada",
    organization: "harbor",
  });

  world.holdSession("better-auth", ada);

  const answer = world.getWorkspace(cookie, { slowly: true });

  world.holdSession(
    "better-auth",
    world.openSession({
      provider: "better-auth",
      person: "grace",
      organization: "summit",
    }),
  );
  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);

  await expect(answer).resolves.toMatchObject({ status: "ok", person: "ada" });

  world.endSession(ada.id);
  world.holdSession("better-auth", ada);

  await expect(world.getWorkspace(cookie, { slowly: false })).resolves.toEqual({
    status: "unauthorized",
  });
});

test("every call into a provider SDK counts once, and a reset forgets every session and starts the count over", () => {
  const world = createWorld();

  const session = world.openSession({
    provider: "http",
    person: "ada",
    organization: "harbor",
  });

  world.holdSession("http", session);
  world.setName("ada", "Ada M.");
  world.setOnline(false);
  world.countCall();
  world.countCall();

  expect(world.state.get()).toEqual({ online: false, slow: false, calls: 2 });

  world.reset();

  expect(world.state.get()).toEqual({ online: true, slow: false, calls: 0 });
  expect(world.getHeldSession("http")).toBe(null);
  expect(world.getSession(session.id)).toBe(null);
  expect(world.getName("ada")).toBe("Ada Moreau");
});
