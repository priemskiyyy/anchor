import { expect, test } from "vitest";

import type { RecordedEvent } from "src/types/internal/RecordedEvent";
import { createRecordedEvent } from "src/utils/createRecordedEvent.fixture";
import { filterEvents } from "src/utils/filterEvents";

const KEY = "5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11";

const events = [
  createRecordedEvent({ id: 1, type: "anchor started" }),
  createRecordedEvent({
    id: 2,
    type: "read completed",
    group: "READS",
    summary: "status signed-in",
    context: '{\n  "status": "signed-in"\n}',
  }),
  createRecordedEvent({
    id: 3,
    type: "session accepted",
    group: "SESSION",
    session: { key: KEY },
    summary: "status signed-in",
    context: '{\n  "status": "signed-in"\n}',
  }),
  createRecordedEvent({
    id: 4,
    type: "token failed",
    group: "TOKENS",
    session: { key: KEY },
    summary: "profile api · forceRefresh true · code TOKEN_FAILED",
    context:
      '{\n  "profile": "api",\n  "forceRefresh": true,\n  "code": "TOKEN_FAILED"\n}',
  }),
  createRecordedEvent({
    id: 5,
    type: "callback ignored",
    group: "CALLBACKS",
    summary: "callback invalidate",
    context: '{\n  "callback": "invalidate"\n}',
  }),
];

const getIds = (filtered: RecordedEvent[]) => filtered.map((entry) => entry.id);

const getIdsMatching = (
  query: string,
  group: RecordedEvent["group"] | null = null,
) => getIds(filterEvents(events, { query, group }));

test("the search matches the type, the session key, the summary and the context, in any case", () => {
  expect(getIdsMatching("ANCHOR")).toEqual([1]);
  expect(getIdsMatching("5f0c1c9e")).toEqual([3, 4]);
  expect(getIdsMatching("forceRefresh true")).toEqual([4]);
  expect(getIdsMatching('"callback": "invalidate"')).toEqual([5]);
  expect(getIdsMatching("signed-in")).toEqual([2, 3]);
  expect(getIdsMatching("nothing like this")).toEqual([]);
});

test("a group narrows the rows to its own, and the search narrows them further", () => {
  expect(getIdsMatching("", "TOKENS")).toEqual([4]);
  expect(getIdsMatching("signed-in", "SESSION")).toEqual([3]);
  expect(getIdsMatching("signed-in", "TOKENS")).toEqual([]);
  expect(getIdsMatching("", "ENDING")).toEqual([]);
});

test("a blank search matches every row", () => {
  expect(getIdsMatching("")).toEqual([1, 2, 3, 4, 5]);
  expect(getIdsMatching("   ")).toEqual([1, 2, 3, 4, 5]);
});
