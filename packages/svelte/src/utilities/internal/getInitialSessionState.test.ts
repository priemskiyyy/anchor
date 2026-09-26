import { expect, test } from "vitest";

import { createAnchor } from "../anchor.fixture.js";
import { getInitialSessionState } from "./getInitialSessionState.js";

test("an Anchor still initializing answers its own state, so a mounted read changes no reference", () => {
  const { anchor } = createAnchor();

  expect(getInitialSessionState(anchor.session)).toBe(anchor.session.get());
});

test("an Anchor that left initializing answers one interned, frozen initializing state", async () => {
  const { anchor } = createAnchor();

  await anchor.start();

  const initial = getInitialSessionState(anchor.session);

  expect(initial).toEqual({ status: "initializing" });
  expect(Object.isFrozen(initial)).toBe(true);
  expect(getInitialSessionState(anchor.session)).toBe(initial);
});
