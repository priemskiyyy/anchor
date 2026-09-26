import { expect, test } from "vitest";

import { createFakeKeycloak } from "src/fakeKeycloak.fixture";
import { chainKeycloakCallback } from "src/utils/chainKeycloakCallback";

test("the chained callback runs the handler, then what the application assigned, with its arguments and the instance as this", () => {
  const { sdk } = createFakeKeycloak();
  const heard: unknown[] = [];

  sdk.onReady = function (this: unknown, authenticated?: boolean) {
    heard.push(["application", this === sdk, authenticated]);
  };

  chainKeycloakCallback(sdk, "onReady", () => heard.push(["handler"]));
  sdk.onReady?.(true);

  expect(heard).toEqual([["handler"], ["application", true, true]]);
});

test("restoring puts back exactly what was assigned, or nothing when nothing was", () => {
  const { sdk } = createFakeKeycloak();

  const assigned = () => {};

  sdk.onAuthLogout = assigned;

  const restoreLogout = chainKeycloakCallback(sdk, "onAuthLogout", () => {});
  const restoreSuccess = chainKeycloakCallback(sdk, "onAuthSuccess", () => {});

  expect(sdk.onAuthLogout).not.toBe(assigned);
  expect(typeof sdk.onAuthSuccess).toBe("function");

  restoreLogout();
  restoreSuccess();

  expect(sdk.onAuthLogout).toBe(assigned);
  expect(sdk.onAuthSuccess).toBe(undefined);
});

test("restoring leaves alone a callback the application replaced after chaining", () => {
  const { sdk } = createFakeKeycloak();

  const replaced = () => {};

  const restore = chainKeycloakCallback(sdk, "onAuthRefreshSuccess", () => {});

  sdk.onAuthRefreshSuccess = replaced;
  restore();

  expect(sdk.onAuthRefreshSuccess).toBe(replaced);
});
