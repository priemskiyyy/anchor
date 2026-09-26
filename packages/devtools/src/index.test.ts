import { expect, test } from "vitest";

import * as api from "src/index";
import * as react from "src/react";
import * as solid from "src/solid";
import * as svelte from "src/svelte";
import * as vue from "src/vue";

test("every entry exports exactly its public runtime names", () => {
  expect(Object.keys(api)).toEqual(["AnchorDevtools"]);
  expect(Object.keys(react)).toEqual(["AnchorDevtools"]);
  expect(Object.keys(solid)).toEqual(["AnchorDevtools"]);
  expect(Object.keys(svelte)).toEqual(["createDevtoolsAttachment"]);
  expect(Object.keys(vue)).toEqual(["AnchorDevtools"]);
});
