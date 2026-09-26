import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAnswer } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { crossTab } from "src/crossTab";
import { createFakeBroadcastChannel } from "src/fakeBroadcastChannel.fixture";

type User = { name: string };

const signedIn = (subject: string, name = subject): SessionAnswer<User> => ({
  status: "signed-in",
  principal: { authority: "https://login.example.com", subject, tenant: null },
  user: { name },
  context: null,
  guest: false,
  impersonated: false,
});

const actionRequired = (subject: string): SessionAnswer<User> => ({
  status: "action-required",
  action: { kind: "accept-terms" },
  principal: { authority: "https://login.example.com", subject, tenant: null },
  user: { name: subject },
  context: null,
  guest: false,
  impersonated: false,
});

const fake = createFakeBroadcastChannel();

// Every other message task has run once a macrotask does.
const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

// Another tab of the application, seen from this one.
const openChannel = (name: string) => new BroadcastChannel(name);

beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", fake.FakeBroadcastChannel);
});

afterEach(() => {
  for (const channel of fake.open) {
    channel.close();
  }

  vi.unstubAllGlobals();
});

test("through the real BroadcastChannel, another tab's invalidation reads the session again", async () => {
  vi.unstubAllGlobals();

  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });
  const other = new BroadcastChannel("anchor:real");

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [crossTab({ name: "real" })],
  });

  await anchor.start();
  other.postMessage("invalidate");

  await expect.poll(() => mock.reads.length).toBe(2);
  other.close();
  anchor.dispose();
});

test("another tab's invalidation reads the session again", async () => {
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  await anchor.start();
  openChannel("anchor:dashboard").postMessage("invalidate");
  await tick();

  expect(mock.reads).toHaveLength(2);
  anchor.dispose();
});

test("a message on another name, or any other message, reads nothing", async () => {
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  await anchor.start();
  openChannel("anchor:billing").postMessage("invalidate");
  openChannel("anchor:dashboard").postMessage({ status: "signed-out" });
  await tick();

  expect(mock.reads).toHaveLength(1);
  anchor.dispose();
});

test("a change of this tab's status or key tells the other tabs to read, the first resolution and a user update do not, and the message is only a reason", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const messages: unknown[] = [];

  openChannel("anchor:dashboard").addEventListener("message", ({ data }) =>
    messages.push(data),
  );

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  await anchor.start();
  mock.push(signedIn("ada", "Ada Lovelace"));
  mock.push(signedIn("grace"));
  mock.push(actionRequired("grace"));
  mock.push({ status: "signed-out" });
  await tick();

  expect(messages).toEqual(["invalidate", "invalidate", "invalidate"]);
  anchor.dispose();
});

test("a sign-out in one tab reaches another tab whose SDK emits nothing", async () => {
  const first = createMockAdapter<User>({ answer: signedIn("ada") });
  const second = createMockAdapter<User>({ answer: signedIn("ada") });

  const firstTab = new Anchor({
    adapter: first.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  const secondTab = new Anchor({
    adapter: second.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  await firstTab.start();
  await secondTab.start();
  second.change({ status: "signed-out" });
  first.push({ status: "signed-out" });
  await tick();

  expect(secondTab.session.get()).toEqual({ status: "signed-out" });
  firstTab.dispose();
  secondTab.dispose();
});

test("removing the hint unsubscribes from the session and closes its channel", () => {
  const unsubscribe = vi.fn();

  const remove = crossTab({ name: "dashboard" })({
    sync: () => {},
    session: {
      get: () => ({ status: "signed-out", key: null }),
      subscribe: () => unsubscribe,
    },
  });

  expect([...fake.open].map(({ name }) => name)).toEqual(["anchor:dashboard"]);

  remove();

  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(fake.open.size).toBe(0);
});

test("where there is no BroadcastChannel, it installs nothing and the Anchor starts", async () => {
  vi.stubGlobal("BroadcastChannel", undefined);

  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [crossTab({ name: "dashboard" })],
  });

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});
