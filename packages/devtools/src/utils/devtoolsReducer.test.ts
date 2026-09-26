import { expect, test } from "vitest";

import { devtoolsReducer } from "src/utils/devtoolsReducer";

test("opening and closing move focus to what they show", () => {
  const opened = devtoolsReducer(
    { panel: { state: "CLOSED", autoFocus: false }, isPaused: false },
    { kind: "OPEN" },
  );

  expect(opened.panel).toEqual({ state: "OPEN", autoFocus: true });
  expect(devtoolsReducer(opened, { kind: "CLOSE" }).panel).toEqual({
    state: "CLOSED",
    autoFocus: true,
  });
});

test("pausing toggles and leaves the panel alone", () => {
  const paused = devtoolsReducer(
    { panel: { state: "OPEN", autoFocus: false }, isPaused: false },
    { kind: "TOGGLE_PAUSE" },
  );

  expect(paused).toEqual({
    panel: { state: "OPEN", autoFocus: false },
    isPaused: true,
  });
  expect(devtoolsReducer(paused, { kind: "TOGGLE_PAUSE" })).toEqual({
    panel: { state: "OPEN", autoFocus: false },
    isPaused: false,
  });
});
