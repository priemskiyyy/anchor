import { afterEach, expect, test, vi } from "vitest";

import { createSessionKey } from "src/utils/internal/runtime/createSessionKey";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a key is a version 4 UUID and no two are alike", () => {
  const keys = new Set(Array.from({ length: 200 }, createSessionKey));

  expect(keys.size).toBe(200);
  expect([...keys].every((key) => UUID.test(key))).toBe(true);
});

test.each([
  ["Hermes, which has no crypto", undefined],
  ["an insecure page, whose crypto has no randomUUID", {}],
])(
  "a runtime without crypto.randomUUID still gets valid keys: %s",
  (_, crypto) => {
    vi.stubGlobal("crypto", crypto);

    const keys = new Set(Array.from({ length: 200 }, createSessionKey));

    expect(keys.size).toBe(200);
    expect([...keys].every((key) => UUID.test(key))).toBe(true);
  },
);
