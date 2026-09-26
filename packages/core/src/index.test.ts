import { expect, test } from "vitest";

import * as api from "src/index";
import * as mock from "src/mock";
import * as testing from "src/testing";

test("every entry exports exactly its public runtime names", () => {
  expect(Object.keys(api).sort()).toEqual(["Anchor", "AnchorError"]);
  expect(Object.keys(mock).sort()).toEqual(["createMockAdapter"]);
  expect(Object.keys(testing).sort()).toEqual(["testSessionAdapter"]);
});
