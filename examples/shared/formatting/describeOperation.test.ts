import type { DiagnosticOperation } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { describeOperation } from "example-shared/formatting/describeOperation";

const OPERATIONS: DiagnosticOperation[] = [
  { kind: "read", queued: false, waiters: 1 },
  { kind: "read", queued: true, waiters: 2 },
  {
    kind: "token",
    session: { key: "3f2a9c1b-5d6e-4f70-8a9b-0c1d2e3f4a5b" },
    profile: "api",
    forceRefresh: false,
    waiters: 1,
  },
  {
    kind: "token",
    session: { key: "3f2a9c1b-5d6e-4f70-8a9b-0c1d2e3f4a5b" },
    profile: "api",
    forceRefresh: true,
    waiters: 3,
  },
  { kind: "end", session: { key: "7e8f9a0b-1c2d-4e3f-9a5b-6c7d8e9f0a1b" } },
];

test("each operation in flight reads in plain words, with its session shortened", () => {
  expect(OPERATIONS.map(describeOperation)).toEqual([
    "Reading the session: 1 caller waits",
    "Reading again next: 2 callers wait",
    "An api token for 3f2a9c1b: 1 caller waits",
    "A fresh api token for 3f2a9c1b: 3 callers wait",
    "Ending the session 7e8f9a0b",
  ]);
});
