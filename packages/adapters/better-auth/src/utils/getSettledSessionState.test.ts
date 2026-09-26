import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { getSettledSessionState } from "src/utils/getSettledSessionState";

// A macrotask runs after every microtask the fake's atom queued.
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

test("a settled atom answers its value at once", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;

  fake.signIn("user_ada");
  await atom.get().refetch();

  await expect(
    getSettledSessionState(atom, new AbortController().signal),
  ).resolves.toBe(atom.get());
});

test("an atom mid-fetch answers the value its fetch settles with, and stops listening", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;

  fake.signIn("user_ada");
  fake.holdFetches();
  fake.refetch();
  await settle();

  const settled = getSettledSessionState(atom, new AbortController().signal);

  expect(fake.listeners.size).toBe(1);

  fake.settleFetches();

  await expect(settled).resolves.toMatchObject({
    data: { user: { id: "user_ada" } },
    isPending: false,
    isRefetching: false,
  });
  expect(fake.listeners.size).toBe(0);
});

test("an abort stops waiting with ABORTED and removes the listener", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;
  const controller = new AbortController();

  fake.holdFetches();
  fake.refetch();
  await settle();

  const settled = getSettledSessionState(atom, controller.signal);

  controller.abort();

  await expect(settled).rejects.toMatchObject({ code: "ABORTED" });
  expect(fake.listeners.size).toBe(0);
});

test("a refetch that replaces the fetch is waited out: only a settled value answers", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;
  let answered: unknown = null;

  fake.signIn("user_ada");
  fake.holdFetches();
  fake.refetch();
  await settle();

  const settled = getSettledSessionState(
    atom,
    new AbortController().signal,
  ).then((value) => {
    answered = value;
  });

  fake.refetch();
  await settle();

  expect(answered).toBe(null);

  fake.settleFetches();
  await settled;

  expect(answered).toMatchObject({ isPending: false, isRefetching: false });
});
