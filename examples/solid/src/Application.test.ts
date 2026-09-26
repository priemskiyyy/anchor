import { fireEvent, within } from "@testing-library/dom";
import { createComponent } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { SLOW_LATENCY } from "example-shared/world/constants/world";
import { Application } from "src/Application";

const labs: SessionLab[] = [];
const disposals: (() => void)[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  for (const dispose of disposals.splice(0)) {
    dispose();
  }

  for (const lab of labs.splice(0)) {
    lab.dispose();
  }

  window.localStorage.clear();
  vi.useRealTimers();
});

// Resolves once every promise callback queued so far has run.
const flushPromises = async () => {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  await vi.advanceTimersByTimeAsync(0);
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

const renderLab = async (provider: string) => {
  const lab = createSessionLab({ provider });

  labs.push(lab);
  await lab.started;

  const root = document.createElement("div");

  document.body.append(root);

  const dispose = render(() => createComponent(Application, { lab }), root);

  disposals.push(() => {
    dispose();
    root.remove();
  });
  await flushPromises();

  return within(root);
};

type Page = Awaited<ReturnType<typeof renderLab>>;

const press = async (page: Page, name: string) => {
  fireEvent.click(page.getByRole("button", { name }));
  await flushPromises();
};

const toggle = async (page: Page, name: string) => {
  fireEvent.click(page.getByRole("switch", { name }));
  await flushPromises();
};

const selectProvider = async (page: Page, value: string) => {
  fireEvent.change(page.getByRole("combobox", { name: "Provider" }), {
    target: { value },
  });
  await flushPromises();
};

const getSessionField = (page: Page, name: string) =>
  within(page.getByRole("region", { name: "Session" }))
    .getByRole("definition", { name })
    .textContent?.trim();

const getProjects = (page: Page) =>
  within(page.getByRole("list", { name: "Project list" }))
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.textContent);

test("Harbor on Solid opens signed out, and Continue as Ada signs her in through the provider and loads her projects", async () => {
  const page = await renderLab("firebase");

  expect(page.getByRole("heading", { name: "Sign in to Harbor" })).toBeTruthy();
  expect(getSessionField(page, "Key")).toBe("none");

  await press(page, "Continue as Ada");

  expect(getSessionField(page, "Status")).toBe("Signed in");
  expect(getSessionField(page, "Subject")).toBe("q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2");
  expect(getProjects(page)).toEqual(["Tide tables", "Mooring plan"]);
  expect(
    page.getByText("Loaded with a token minted for this session."),
  ).toBeTruthy();
});

test("switching the provider in Solid starts Harbor over the next adapter, with the same person under a new key and a reason", async () => {
  const page = await renderLab("firebase");

  await press(page, "Continue as Ada");

  const firebase = getSessionField(page, "Key");

  await selectProvider(page, "auth0");

  expect(getSessionField(page, "Authority")).toBe(
    "https://harbor-lab.us.auth0.com/",
  );
  expect(getSessionField(page, "Key")).not.toBe(firebase);
  expect(
    page.getByRole("status", { name: "Key change" }).textContent?.trim(),
  ).toBe("Another provider vouches for this person, so a new key.");
  expect(getProjects(page)).toEqual(["Tide tables", "Mooring plan"]);
});

test("Solid's Harbor restores slowly behind Restoring your session, and is unavailable, never signed out, when the provider cannot be reached", async () => {
  const page = await renderLab("http");

  await press(page, "Continue as Ada");
  await toggle(page, "Slow provider");
  await press(page, "Reload Harbor");

  expect(page.getByText("Restoring your session")).toBeTruthy();

  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(SLOW_LATENCY);
  await flushPromises();

  expect(getSessionField(page, "Status")).toBe("Signed in");

  await toggle(page, "Slow provider");
  await toggle(page, "Offline");
  await press(page, "Reload Harbor");

  expect(
    page.getByRole("heading", { name: "We can't reach the sign-in service" }),
  ).toBeTruthy();
  expect(page.queryByRole("heading", { name: "Sign in to Harbor" })).toBe(null);
});

test("Solid's Harbor shows the two-factor step under the same key, and Set up two-factor opens it again", async () => {
  const page = await renderLab("http");

  await press(page, "Continue as Ada");

  const key = getSessionField(page, "Key");

  await press(page, "Require two-factor");

  expect(
    page.getByRole("heading", { name: "Finish setting up two-factor" }),
  ).toBeTruthy();
  expect(getSessionField(page, "Key")).toBe(key);

  await press(page, "Set up two-factor");

  expect(getSessionField(page, "Status")).toBe("Signed in");
  expect(getSessionField(page, "Key")).toBe(key);
});

test("Solid disables what the provider cannot do and says why", async () => {
  const page = await renderLab("auth0");

  await press(page, "Continue as Ada");

  const duplicate = page.getByRole("button", {
    name: "Send a duplicate event",
  });

  expect(duplicate.hasAttribute("disabled")).toBe(true);
  expect(
    document.getElementById(duplicate.getAttribute("aria-describedby") ?? "")
      ?.textContent,
  ).toContain("auth0-spa-js emits no events");
});

test("the devtools mount once in a shadow root of their own, and follow the next provider's Anchor", async () => {
  const page = await renderLab("firebase");

  await press(page, "Continue as Ada");
  await selectProvider(page, "okta");

  const hosts = document.querySelectorAll("[data-anchor-devtools]");
  const devtools = hosts[0]?.shadowRoot;

  expect(hosts).toHaveLength(1);
  expect(
    devtools?.querySelector('button[aria-label="Open Anchor devtools"]')
      ?.textContent,
  ).toBe("Anchor");

  devtools
    ?.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Anchor devtools"]',
    )
    ?.click();
  await flushPromises();

  expect(devtools?.querySelector(".status")?.textContent).toBe("started");
  expect(devtools?.querySelector(".session")?.textContent).toBe(
    `okta · signed-in · generation #1 · key ${getSessionField(page, "Key")}`,
  );
});
