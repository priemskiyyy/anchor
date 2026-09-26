import { flushSync, hydrate, unmount } from "svelte";
import { afterEach, expect, test, vi } from "vitest";

import { createAnchor, signedIn } from "../utilities/anchor.fixture.js";
import SessionStatusHarness from "../utilities/SessionStatusHarness.fixture.svelte";
import { SESSION_STATUS_MARKUP } from "./serverMarkup.fixture.js";

afterEach(() => {
  document.body.replaceChildren();
});

test("the client hydrates from the server's initializing without a mismatch, keeping the server's node, then shows the session", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");

  await anchor.start();

  const target = document.body.appendChild(document.createElement("div"));

  target.innerHTML = SESSION_STATUS_MARKUP;

  const rendered = target.querySelector("span");
  const app = hydrate(SessionStatusHarness, { target, props: { anchor } });

  expect(target.textContent).toBe("initializing");

  flushSync();

  expect(target.querySelector("span")).toBe(rendered);
  expect(target.textContent).toBe("signed-in");
  expect(warn.mock.calls).toEqual([]);
  expect(error.mock.calls).toEqual([]);

  unmount(app);
});
