import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { createAnchor, signedIn } from "src/hooks/anchor.fixture";
import { useSession } from "src/hooks/useSession";

const Status = () => <span>{useSession().status}</span>;

test("the client hydrates from the server's initializing without a mismatch, then shows the session", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const errors = vi.spyOn(console, "error");
  const onRecoverableError = vi.fn();

  const view = (
    <AnchorProvider anchor={anchor}>
      <Status />
    </AnchorProvider>
  );

  const html = renderToString(view);

  await anchor.start();

  const container = document.createElement("div");

  container.innerHTML = html;
  document.body.append(container);

  let root: ReturnType<typeof hydrateRoot> | null = null;

  await act(async () => {
    root = hydrateRoot(container, view, { onRecoverableError });
  });

  expect(container.innerHTML).toBe("<span>signed-in</span>");
  expect(onRecoverableError.mock.calls).toEqual([]);
  expect(errors.mock.calls).toEqual([]);

  act(() => root?.unmount());
  container.remove();
});
