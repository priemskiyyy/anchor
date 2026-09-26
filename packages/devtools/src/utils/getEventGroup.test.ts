import type { AnchorDiagnosticType } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";
import { getEventGroup } from "src/utils/getEventGroup";

const CLOSED_LIST: [AnchorDiagnosticType, RecordedEventGroup][] = [
  ["anchor started", "LIFECYCLE"],
  ["anchor start failed", "LIFECYCLE"],
  ["anchor disposed", "LIFECYCLE"],
  ["read started", "READS"],
  ["read completed", "READS"],
  ["read failed", "READS"],
  ["read superseded", "READS"],
  ["answer invalid", "READS"],
  ["session accepted", "SESSION"],
  ["session updated", "SESSION"],
  ["session signed out", "SESSION"],
  ["session unavailable", "SESSION"],
  ["token requested", "TOKENS"],
  ["token joined", "TOKENS"],
  ["token received", "TOKENS"],
  ["token failed", "TOKENS"],
  ["token discarded", "TOKENS"],
  ["end started", "ENDING"],
  ["end completed", "ENDING"],
  ["end failed", "ENDING"],
  ["callback ignored", "CALLBACKS"],
];

test("every phrase of the closed list is filed under the group of what it reports", () => {
  expect(
    CLOSED_LIST.map(([type]) => [type, getEventGroup({ type, context: null })]),
  ).toEqual(CLOSED_LIST);
});

test("an invalid answer is filed with the call that answered: a token request, an ending, or else a read", () => {
  expect(
    getEventGroup({ type: "answer invalid", context: { operation: "token" } }),
  ).toBe("TOKENS");
  expect(
    getEventGroup({ type: "answer invalid", context: { operation: "end" } }),
  ).toBe("ENDING");
  expect(
    getEventGroup({ type: "answer invalid", context: { operation: "push" } }),
  ).toBe("READS");
  expect(
    getEventGroup({
      type: "answer invalid",
      context: { code: "INVALID_ANSWER" },
    }),
  ).toBe("READS");
  expect(
    getEventGroup({ type: "token failed", context: { operation: "end" } }),
  ).toBe("TOKENS");
});
