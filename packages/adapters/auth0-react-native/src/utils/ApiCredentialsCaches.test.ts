import { expect, test } from "vitest";

import { ApiCredentialsCaches } from "src/utils/ApiCredentialsCaches";

test("a cache belongs only to the login it was filled for", () => {
  const caches = new ApiCredentialsCaches();

  expect(caches.isOwnedBy("api", "ada")).toBe(false);

  caches.setOwner("api", "ada");

  expect(caches.isOwnedBy("api", "ada")).toBe(true);
  expect(caches.isOwnedBy("api", "grace")).toBe(false);
  expect(caches.isOwnedBy("billing", "ada")).toBe(false);
});

test("an exchange starts only once the one before it settled, even when that one failed", async () => {
  const caches = new ApiCredentialsCaches();
  const order: string[] = [];
  const failure = new Error("refused");

  let release = () => {};

  const first = caches.enqueue(async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    order.push("first");

    throw failure;
  });

  const second = caches.enqueue(async () => {
    order.push("second");

    return "minted";
  });

  await Promise.resolve();
  expect(order).toEqual([]);

  release();

  await expect(first).rejects.toBe(failure);
  await expect(second).resolves.toBe("minted");
  expect(order).toEqual(["first", "second"]);
});

test("a change of login forgets every owner, and the same login again keeps them", () => {
  const caches = new ApiCredentialsCaches();

  caches.noteLogin("ada");
  caches.setOwner("api", "ada");
  caches.noteLogin("ada");

  expect(caches.isOwnedBy("api", "ada")).toBe(true);

  caches.noteLogin("grace");

  expect(caches.isOwnedBy("api", "ada")).toBe(false);
});
