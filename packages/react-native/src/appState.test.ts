import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { expect, test } from "vitest";

import { appState } from "src/appState";
import { createFakeAppState } from "src/fakeAppState.fixture";

type User = { name: string };

// Every read the mock settles has settled once a macrotask runs.
const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const create = (initial?: string | null) => {
  const fake = createFakeAppState(initial);
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [appState({ sdk: fake.sdk })],
  });

  return { fake, mock, anchor };
};

test("creating the hint and the Anchor subscribes to nothing; the start subscribes once", async () => {
  const { fake, anchor } = create();

  expect(fake.listeners.size).toBe(0);

  await anchor.start();

  expect(fake.listeners.size).toBe(1);
});

test("returning to the foreground reads the session again, and going to the background or inactive reads nothing", async () => {
  const { fake, mock, anchor } = create();

  await anchor.start();
  fake.change("inactive");
  fake.change("background");

  expect(mock.reads).toHaveLength(1);

  fake.change("active");
  await tick();

  expect(mock.reads).toHaveLength(2);

  fake.change("inactive");
  fake.change("active");
  await tick();

  expect(mock.reads).toHaveLength(3);
});

test("an app started in the background reads again when it first comes to the foreground", async () => {
  const { fake, mock, anchor } = create("background");

  await anchor.start();
  fake.change("active");

  expect(mock.reads).toHaveLength(2);
});

test("a repeated active report is not a return to the foreground", async () => {
  const { fake, mock, anchor } = create();

  await anchor.start();
  fake.change("active");

  expect(mock.reads).toHaveLength(1);
});

test("dispose removes the subscription", async () => {
  const { fake, anchor } = create();

  await anchor.start();
  anchor.dispose();

  expect(fake.listeners.size).toBe(0);
});
