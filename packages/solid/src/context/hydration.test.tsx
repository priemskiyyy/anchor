import { hydrate } from "solid-js/web";
import { afterEach, expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { SESSION_STATUS_MARKUP } from "src/context/serverMarkup.fixture";
import { SessionStatus } from "src/context/SessionStatus.fixture";
import { createAnchor, signedIn } from "src/primitives/anchor.fixture";

const disposals: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposals.splice(0)) {
    dispose();
  }

  document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, "_$HY");
});

test("the client hydrates from the server's initializing without a mismatch, keeping the server's node, then shows the session", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");

  await anchor.start();

  // Solid hydrates through the global that the page's hydration script creates, so the test creates it.
  Object.assign(globalThis, {
    _$HY: { events: [], completed: new WeakSet(), r: {}, fe: () => {} },
  });

  const container = document.body.appendChild(document.createElement("div"));

  container.innerHTML = SESSION_STATUS_MARKUP;

  const rendered = container.firstChild;

  disposals.push(
    hydrate(
      () => (
        <AnchorProvider anchor={anchor}>
          <SessionStatus />
        </AnchorProvider>
      ),
      container,
    ),
  );

  expect(container.childNodes).toHaveLength(1);
  expect(container.firstChild).toBe(rendered);
  expect(container.textContent).toBe("signed-in");
  expect(warn.mock.calls).toEqual([]);
  expect(error.mock.calls).toEqual([]);
});
