import { expect, test } from "vitest";

import { getInitialDevtoolsState } from "src/utils/getInitialDevtoolsState";

test("the initial state opens only when asked and never moves focus on mount", () => {
  expect(getInitialDevtoolsState(false)).toEqual({
    panel: { state: "CLOSED", autoFocus: false },
    isPaused: false,
  });
  expect(getInitialDevtoolsState(true)).toEqual({
    panel: { state: "OPEN", autoFocus: false },
    isPaused: false,
  });
});
