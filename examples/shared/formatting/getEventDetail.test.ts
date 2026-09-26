import { expect, test } from "vitest";

import { getEventDetail } from "example-shared/formatting/getEventDetail";

test("one field of an event's detail reads as text, and a missing field or detail as null", () => {
  expect(getEventDetail({ code: "READ_FAILED" }, "code")).toBe("READ_FAILED");
  expect(getEventDetail({ forceRefresh: false }, "forceRefresh")).toBe("false");
  expect(getEventDetail({ code: "READ_FAILED" }, "profile")).toBe(null);
  expect(getEventDetail(undefined, "code")).toBe(null);
});
