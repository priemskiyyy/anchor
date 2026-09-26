import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { SLOW_LATENCY } from "example-shared/world/constants/world";
import { Application } from "src/Application";
import { createDevtoolsControls } from "src/utils/createDevtoolsControls";

const labs: SessionLab[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();

  for (const lab of labs.splice(0)) {
    lab.dispose();
  }

  window.localStorage.clear();
  vi.useRealTimers();
});

// Resolves once every promise callback queued so far has run.
const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const settle = async () => {
  await act(async () => {
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();
  });
};

const waitForLatency = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SLOW_LATENCY);
    await flushPromises();
  });
};

const renderLab = async (provider: string) => {
  const lab = createSessionLab({
    provider,
    devtools: createDevtoolsControls(document),
  });

  labs.push(lab);
  await lab.started;
  render(<Application lab={lab} />);
  await settle();

  return lab;
};

const press = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
  await settle();
};

const toggle = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("switch", { name }));
  });
  await settle();
};

const selectProvider = async (label: string) => {
  await act(async () => {
    fireEvent.change(screen.getByRole("combobox", { name: "Provider" }), {
      target: { value: getProviderId(label) },
    });
  });
  await settle();
};

const getProviderId = (label: string) =>
  within(screen.getByRole("combobox", { name: "Provider" }))
    .getByRole("option", { name: label })
    .getAttribute("value") ?? "";

const getSessionField = (name: string) =>
  within(screen.getByRole("region", { name: "Session" })).getByRole(
    "definition",
    { name },
  ).textContent;

const getKeyChange = () =>
  screen.getByRole("status", { name: "Key change" }).textContent;

const getProjects = () =>
  within(screen.getByRole("list", { name: "Project list" }))
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.textContent);

const getTimelineLines = () =>
  within(screen.getByRole("list", { name: "Timeline events" }))
    .getAllByRole("listitem")
    .map((item) => item.children[1]?.textContent);

const getDescription = (element: HTMLElement) =>
  document.getElementById(element.getAttribute("aria-describedby") ?? "")
    ?.textContent;

const getSelectedProvider = () => {
  const picker = screen.getByRole("combobox", { name: "Provider" });

  return picker instanceof HTMLSelectElement ? picker.value : null;
};

const getCallCount = () =>
  screen.getByRole("status", { name: "Provider call count" }).textContent;

// Steps the running tour through its Next button, letting the three-second provider answer while a step works.
const stepTourToEnd = async () => {
  const titles: (string | null)[] = [];

  for (let turn = 0; turn < 30; turn += 1) {
    await settle();

    const panel = screen.queryByRole("region", { name: "Tour" });

    if (panel === null) {
      return titles;
    }

    const next = within(panel).getByRole("button", { name: /^(Next|Finish)$/ });

    if (next.hasAttribute("disabled")) {
      await waitForLatency();

      continue;
    }

    titles.push(within(panel).getByRole("heading", { level: 2 }).textContent);
    await act(async () => {
      fireEvent.click(next);
    });
  }

  throw new Error("The tour did not end.");
};

const startTour = async (title: string) => {
  await press("Tours");
  await press(`Start ${title}`);
};

const getTourStepTitle = () =>
  within(screen.getByRole("region", { name: "Tour" })).getByRole("heading", {
    level: 2,
  }).textContent;

const pressNextStep = async () => {
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole("region", { name: "Tour" })).getByRole("button", {
        name: /^(Next|Finish)$/,
      }),
    );
  });
  await settle();
};

test("a provider with nobody signed in shows Harbor's sign-in card, and Continue as Ada signs her in through the provider and loads her projects with a token", async () => {
  await renderLab("firebase");

  expect(
    screen.getByRole("heading", { name: "Sign in to Harbor" }),
  ).toBeTruthy();
  expect(getSessionField("Status")).toBe("Signed out");
  expect(getSessionField("Key")).toBe("none");

  await press("Continue as Ada");

  expect(screen.getByText("ada@harbor.example")).toBeTruthy();
  expect(getSessionField("Subject")).toBe("q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2");
  expect(getSessionField("Authority")).toBe(
    "https://securetoken.google.com/harbor-lab",
  );
  expect(getProjects()).toEqual(["Tide tables", "Mooring plan"]);
  expect(
    screen.getByText("Loaded with a token minted for this session."),
  ).toBeTruthy();
  expect(getKeyChange()).toBe("A session began, so a new key.");
});

test("a slow provider keeps Harbor on Restoring your session through a reload, then shows the same person, never a sign-in card in between", async () => {
  await renderLab("supabase");
  await press("Continue as Ada");
  await toggle("Slow provider");
  await press("Reload Harbor");

  expect(screen.getByText("Restoring your session")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Sign in to Harbor" })).toBe(
    null,
  );
  expect(getSessionField("Status")).toBe("Initializing");

  await waitForLatency();
  await waitForLatency();

  expect(getSessionField("Status")).toBe("Signed in");
  expect(screen.getByText("Ada Moreau")).toBeTruthy();
  expect(getKeyChange()).toBe(
    "Harbor started again, and a key is never reused: a new key.",
  );
});

test("a provider that cannot be reached at start shows We can't reach the sign-in service, never a sign-in card, and Retry restores the person once the network is back", async () => {
  await renderLab("http");
  await press("Continue as Ada");
  await toggle("Offline");
  await press("Reload Harbor");

  expect(
    screen.getByRole("heading", { name: "We can't reach the sign-in service" }),
  ).toBeTruthy();
  expect(getSessionField("Status")).toBe("Unavailable");
  expect(getSessionField("Error")).toBe("READ_FAILED");

  await press("Retry");

  expect(
    screen.getByText("Still no answer from the sign-in service."),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Sign in to Harbor" })).toBe(
    null,
  );

  await toggle("Offline");
  await press("Retry");

  expect(getSessionField("Status")).toBe("Signed in");
  expect(getSessionField("Subject")).toBe("user_ada");
});

test("keycloak-js initializes once per page, so its unavailable screen sends the visitor to Reload Harbor instead of promising a retry", async () => {
  await renderLab("keycloak");
  await press("Continue as Ada");
  await toggle("Offline");
  await press("Reload Harbor");

  expect(
    screen.getByText(
      "Keycloak initializes once per page, so only Reload Harbor, above, tries again.",
    ),
  ).toBeTruthy();

  await toggle("Offline");
  await press("Retry");

  expect(getSessionField("Status")).toBe("Unavailable");

  await press("Reload Harbor");

  expect(getSessionField("Status")).toBe("Signed in");
});

test("two-factor blocks the session under the same key and refuses its tokens, and Set up two-factor opens Harbor again under that key", async () => {
  await renderLab("http");
  await press("Continue as Ada");

  const key = getSessionField("Key");

  await press("Require two-factor");

  expect(
    screen.getByRole("heading", { name: "Finish setting up two-factor" }),
  ).toBeTruthy();
  expect(getSessionField("Status")).toBe("Action required");
  expect(getSessionField("Action")).toBe("setup-mfa");
  expect(getSessionField("Key")).toBe(key);
  expect(getKeyChange()).toBe(
    "The provider blocks the same session on a step: the key stays.",
  );
  expect(
    screen.getByText("A blocked session keeps its key and mints nothing"),
  ).toBeTruthy();

  await press("Set up two-factor");

  expect(getSessionField("Status")).toBe("Signed in");
  expect(getSessionField("Key")).toBe(key);
  expect(getProjects()).toEqual(["Tide tables", "Mooring plan"]);
});

test("signing out says what the ending proved, and opening Auth0's logout page ends Auth0's own session", async () => {
  await renderLab("auth0");
  await press("Continue as Ada");
  await press("Sign out");

  const result = screen.getByRole("status", { name: "Sign-out result" });

  expect(result.textContent).toContain("Signed out on this device.");
  expect(result.textContent).toContain(
    "Auth0's own session may still be open.",
  );
  expect(
    within(result).getByText(
      /^https:\/\/harbor-lab\.us\.auth0\.com\/v2\/logout\?/,
    ),
  ).toBeTruthy();

  await press("Open Auth0's logout page");

  expect(result.textContent).toContain(
    "You opened Auth0's logout page, so its own session ended too.",
  );
});

test("switching the provider rebuilds Harbor over another real adapter with the same person signed in, and says why the key changed", async () => {
  await renderLab("firebase");
  await press("Continue as Ada");

  const firebaseKey = getSessionField("Key");

  await selectProvider("Supabase");

  expect(getSessionField("Authority")).toBe("supabase");
  expect(getSessionField("Subject")).toBe(
    "ada0c3f1-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  );
  expect(getSessionField("Key")).not.toBe(firebaseKey);
  expect(getKeyChange()).toBe(
    "Another provider vouches for this person, so a new key.",
  );
  expect(screen.getByText("Ada Moreau")).toBeTruthy();
  expect(getProjects()).toEqual(["Tide tables", "Mooring plan"]);
  expect(screen.getByText(/On Supabase:/).parentElement?.textContent).toContain(
    "pushes every change",
  );
});

test("what a provider cannot do is disabled and says why, from its capabilities alone", async () => {
  await renderLab("auth0");
  await press("Continue as Ada");

  const duplicate = screen.getByRole("button", {
    name: "Send a duplicate event",
  });

  expect(duplicate.hasAttribute("disabled")).toBe(true);
  expect(getDescription(duplicate)).toBe(
    "auth0-spa-js emits no events: Anchor learns a change on its next read, so there is no event to repeat.",
  );
  expect(
    screen
      .getByRole("button", { name: "End the session on the server" })
      .hasAttribute("disabled"),
  ).toBe(false);

  await selectProvider("Firebase");

  const organization = screen.getByRole("combobox", { name: "Organization" });

  expect(organization.hasAttribute("disabled")).toBe(true);
  expect(getDescription(organization)).toBe(
    "Firebase sessions name no organization.",
  );

  await selectProvider("Your backend");

  expect(
    screen
      .getByRole("button", { name: "Require two-factor" })
      .hasAttribute("disabled"),
  ).toBe(false);
  expect(
    screen
      .getByRole("button", { name: "Send a stale callback" })
      .hasAttribute("disabled"),
  ).toBe(true);
});

test("a misbehavior that needs a session says so while nobody is signed in", async () => {
  await renderLab("oidc");

  const stale = screen.getByRole("button", { name: "Send a stale callback" });

  expect(stale.hasAttribute("disabled")).toBe(true);
  expect(getDescription(stale)).toBe("Sign in first: this needs a session.");
});

test("the session card says why the key changed: a rename keeps it, another organization and another person replace it", async () => {
  await renderLab("better-auth");
  await press("Continue as Ada");

  const ada = getSessionField("Key");

  await press("Use short name");

  expect(screen.getByText("Ada M.")).toBeTruthy();
  expect(getSessionField("Key")).toBe(ada);
  expect(getKeyChange()).toBe(
    "The name changed and the key stayed: the same person in the same security context.",
  );

  await act(async () => {
    fireEvent.change(screen.getByRole("combobox", { name: "Organization" }), {
      target: { value: "summit" },
    });
  });
  await settle();

  expect(getSessionField("Key")).not.toBe(ada);
  expect(getKeyChange()).toBe("Another organization, so a new key.");
  expect(getProjects()).toEqual(["Ridge survey"]);

  await press("Switch to Grace");

  expect(getKeyChange()).toBe("Another person, so a new key.");
  expect(getProjects()).toEqual(["Base camp logistics", "Trail markers"]);
});

test("a duplicate event publishes nothing and keeps the key, and its notice names the guarantee", async () => {
  await renderLab("firebase");
  await press("Continue as Ada");

  const key = getSessionField("Key");
  const lines = getTimelineLines().length;

  await press("Send a duplicate event");

  const card = screen
    .getByRole("button", { name: "Send a duplicate event" })
    .closest("li");

  if (card === null) {
    throw new Error("Expected the duplicate event to sit on a card.");
  }

  expect(getSessionField("Key")).toBe(key);
  expect(getTimelineLines()).toHaveLength(lines);
  expect(
    within(card).getByText("The same session publishes nothing new"),
  ).toBeTruthy();
  expect(
    within(card).getByText(
      "onIdTokenChanged reported the same user again. Anchor published nothing: no render, the same key.",
    ),
  ).toBeTruthy();

  await press("Dismiss The same session publishes nothing new");

  expect(screen.queryByText("The same session publishes nothing new")).toBe(
    null,
  );
});

test("a sign-in in another tab that Auth0 tells nobody about leaves Anchor on Ada until her token is refused, then Harbor reads again and Grace gets a key of her own", async () => {
  await renderLab("auth0");
  await press("Continue as Ada");

  const ada = getSessionField("Key");

  await press("Sign in as someone else in another tab");

  expect(getSessionField("Key")).toBe(ada);
  expect(screen.getByText("Ada Moreau")).toBeTruthy();

  await press("Reload");

  expect(getSessionField("Key")).not.toBe(ada);
  expect(getSessionField("Subject")).toBe("auth0|66f16ace7e112b3c4d5e9f60");
  expect(getTimelineLines()).toContain(
    `Harbor's token request for key ${ada?.slice(0, 8)} rejected with SESSION_CHANGED.`,
  );
  expect(getProjects()).toEqual(["Base camp logistics", "Trail markers"]);
});

test("a stale callback's late answer is superseded, and Grace stays under her key", async () => {
  await renderLab("oidc");
  await press("Continue as Ada");
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Send a stale callback" }),
    );
  });
  await settle();

  const grace = getSessionField("Key");

  expect(getSessionField("Subject")).toBe(
    "8e7d6c5b-9ace-4a3b-8c2d-1f0e9d8c7b6a",
  );

  await waitForLatency();

  expect(getTimelineLines()).toContain(
    "A read answered after a newer event, so Anchor discarded its answer.",
  );
  expect(getSessionField("Key")).toBe(grace);
  expect(
    screen.getByText("A late answer never restores an older session"),
  ).toBeTruthy();
});

test("a partial sign-out says the provider could not confirm its own session ended, and offers no logout page", async () => {
  await renderLab("keycloak");
  await press("Continue as Ada");
  await press("Sign out partially");

  const result = screen.getByRole("status", { name: "Sign-out result" });

  expect(result.textContent).toContain("Signed out on this device.");
  expect(result.textContent).toContain(
    "Keycloak's own session may still be open.",
  );
  expect(within(result).queryByRole("button")).toBe(null);
  expect(screen.getByText("An ending says what it proved")).toBeTruthy();
});

test("a session ended on the server stays signed in until the provider says so: Better Auth's 401 after Harbor reloads its projects signs out", async () => {
  await renderLab("better-auth");
  await press("Continue as Ada");
  await press("End the session on the server");

  expect(getSessionField("Status")).toBe("Signed in");

  await press("Reload");

  expect(getSessionField("Status")).toBe("Signed out");
  expect(
    screen.getByRole("heading", { name: "Sign in to Harbor" }),
  ).toBeTruthy();
});

test("offline, Harbor's calls fail and nobody is signed out", async () => {
  await renderLab("supabase");
  await press("Continue as Ada");
  await toggle("Offline");
  await press("Reload");

  expect(screen.getByText("Harbor's API can't be reached.")).toBeTruthy();
  expect(getSessionField("Status")).toBe("Signed in");
  expect(screen.getByText("A failure is never a logout")).toBeTruthy();
});

test("the work tour over Firebase rejects Ada's token at once, discards it when it lands, and leaves Grace with only her own projects", async () => {
  await renderLab("firebase");
  await startTour("Work belongs to its session");
  await pressNextStep();

  expect(getTourStepTitle()).toBe("A slow request starts");
  expect(
    within(
      screen.getByRole("list", { name: "Operations in flight" }),
    ).getByText(/^A fresh api token for /),
  ).toBeTruthy();

  await pressNextStep();

  expect(getSessionField("Subject")).toBe("h2Lk5GrcO8wQ1vB6nC3pX9sRt7Ma");
  expect(getTimelineLines()).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^Harbor's token request for key [0-9a-f]{8} rejected with SESSION_CHANGED\.$/,
      ),
    ]),
  );

  expect(await stepTourToEnd()).toEqual([
    "Grace signs in before it lands",
    "The late answer changes nothing",
  ]);
  expect(getTimelineLines()[0]).toMatch(
    /^The api token for key [0-9a-f]{8} arrived after its session was gone, and Anchor discarded it\.$/,
  );
  expect(getProjects()).toEqual(["Base camp logistics", "Trail markers"]);
});

test("the work tour over Better Auth files Ada's late cookie answer under her own key, and Grace sees only her own projects", async () => {
  await renderLab("better-auth");
  await startTour("Work belongs to its session");

  expect(await stepTourToEnd()).toEqual([
    "Ada signs in",
    "A slow request starts",
    "Grace signs in before it lands",
    "The late answer changes nothing",
  ]);
  expect(getTimelineLines()[0]).toMatch(
    /^Harbor's API answered for key [0-9a-f]{8} after that session was gone, so the list stays under its own key\.$/,
  );
  expect(getProjects()).toEqual(["Base camp logistics", "Trail markers"]);
});

test("the failure tour over your backend starts unavailable offline, stays so on Retry, and Retry restores Ada online", async () => {
  await renderLab("http");
  await startTour("A failure is never a logout");
  await pressNextStep();

  expect(
    screen.getByRole("heading", { name: "We can't reach the sign-in service" }),
  ).toBeTruthy();

  expect(await stepTourToEnd()).toEqual([
    "The network drops, and Harbor reloads",
    "Retry while still offline",
    "Back online",
  ]);
  expect(getSessionField("Status")).toBe("Signed in");
  expect(getSessionField("Subject")).toBe("user_ada");
});

test("the failure tour over Firebase restores Ada offline from Firebase's own storage, and her calls fail without signing her out", async () => {
  await renderLab("firebase");
  await startTour("A failure is never a logout");
  await pressNextStep();

  expect(getSessionField("Status")).toBe("Signed in");

  await pressNextStep();

  expect(getTourStepTitle()).toBe("Harbor's calls fail too");
  expect(screen.getByText("Harbor's API can't be reached.")).toBeTruthy();
  expect(await stepTourToEnd()).toEqual([
    "Harbor's calls fail too",
    "Back online",
  ]);
  expect(getProjects()).toEqual(["Tide tables", "Mooring plan"]);
});

test("the keys tour over Auth0 keeps the key through a rename and replaces it for another organization and another person", async () => {
  await renderLab("auth0");
  await startTour("The key changes exactly when the security context does");

  const keys = [getSessionField("Key")];

  await pressNextStep();
  keys.push(getSessionField("Key"));
  await pressNextStep();
  keys.push(getSessionField("Key"));

  expect(getKeyChange()).toBe("Another organization, so a new key.");
  expect(await stepTourToEnd()).toEqual([
    "Another organization is a new key",
    "Another person is a new key",
  ]);
  keys.push(getSessionField("Key"));
  expect(keys[1]).toBe(keys[0]);
  expect(new Set(keys).size).toBe(3);
});

test("the keys tour over Supabase skips the organization step, since Supabase sessions name none", async () => {
  await renderLab("supabase");
  await startTour("The key changes exactly when the security context does");

  expect(await stepTourToEnd()).toEqual([
    "Ada signs in: a new key",
    "A rename keeps the key",
    "Another person is a new key",
  ]);
  expect(getKeyChange()).toBe("Another person, so a new key.");
});

test("the ending tour over OIDC shows a complete ending, a partial one and the end-session page", async () => {
  await renderLab("oidc");
  await startTour("Ending means this session");
  await pressNextStep();

  expect(
    screen.getByRole("status", { name: "Sign-out result" }).textContent,
  ).toContain("OIDC's own session may still be open.");

  await pressNextStep();

  expect(getTourStepTitle()).toBe(
    "A partial sign-out says what it could not prove",
  );
  expect(
    within(screen.getByRole("status", { name: "Sign-out result" })).queryByRole(
      "button",
    ),
  ).toBe(null);
  expect(await stepTourToEnd()).toEqual([
    "A partial sign-out says what it could not prove",
    "A logout page finishes the job",
  ]);
  expect(
    screen.getByRole("button", { name: "Open OIDC's logout page" }),
  ).toBeTruthy();
});

test("the ending tour over Supabase proves a remote ending, skips the partial one, and switches to Auth0 for its logout page", async () => {
  await renderLab("supabase");
  await startTour("Ending means this session");
  await pressNextStep();

  expect(
    screen.getByRole("status", { name: "Sign-out result" }).textContent,
  ).toContain("Supabase ended its own session too.");
  expect(await stepTourToEnd()).toEqual([
    "Signing out says what it proved",
    "A logout page finishes the job",
  ]);
  expect(getSelectedProvider()).toBe("auth0");
});

test("the providers tour carries Ada across five providers under a new key each, with the same app on screen", async () => {
  await renderLab("okta");
  await startTour("One app, any provider");

  const authorities = [getSessionField("Authority")];

  for (const provider of ["supabase", "auth0", "better-auth"]) {
    await pressNextStep();
    expect(getSelectedProvider()).toBe(provider);
    expect(screen.getByText("Ada Moreau")).toBeTruthy();
    authorities.push(getSessionField("Authority"));
  }

  expect(
    screen.getByText(
      "Loaded with the session cookie: this provider mints no tokens.",
    ),
  ).toBeTruthy();
  expect(await stepTourToEnd()).toEqual([
    "Better Auth mints no tokens",
    "Your own backend",
  ]);
  expect(getSelectedProvider()).toBe("http");
  expect(
    screen.getByRole("heading", { name: "Finish setting up two-factor" }),
  ).toBeTruthy();
  expect(authorities).toEqual([
    "https://securetoken.google.com/harbor-lab",
    "supabase",
    "https://harbor-lab.us.auth0.com/",
    "better-auth",
  ]);
});

test("the providers tour starts on Firebase from any provider", async () => {
  await renderLab("http");
  await startTour("One app, any provider");

  expect(getSelectedProvider()).toBe("firebase");
  expect(await stepTourToEnd()).toEqual([
    "Harbor on Firebase",
    "The same app on Supabase",
    "Auth0 emits nothing",
    "Better Auth mints no tokens",
    "Your own backend",
  ]);
});

for (const provider of ["firebase", "keycloak"]) {
  test(`the diagnostics tour over ${provider} opens the real devtools and shows their values while the provider call counter stays where it was`, async () => {
    await renderLab(provider);
    await startTour("Diagnostics are passive");

    const calls = getCallCount();

    const devtools = document.querySelector(
      "[data-anchor-devtools]",
    )?.shadowRoot;

    await pressNextStep();

    expect(
      devtools?.querySelector('aside[aria-label="Anchor devtools"]'),
    ).not.toBe(null);
    expect(getCallCount()).toBe(calls);

    await pressNextStep();

    expect(devtools?.textContent).not.toContain("principal hidden");
    expect(getCallCount()).toBe(calls);
    expect(await stepTourToEnd()).toEqual([
      "Show the values",
      "Close the devtools",
    ]);
    expect(devtools?.querySelector('aside[aria-label="Anchor devtools"]')).toBe(
      null,
    );
    expect(getCallCount()).toBe(calls);
  });
}

test("Back shows the previous step again without doing it twice, and End tour leaves the lab as it is", async () => {
  await renderLab("firebase");
  await startTour("The key changes exactly when the security context does");
  await pressNextStep();

  const renamed = getSessionField("Key");

  await press("Back");

  expect(getTourStepTitle()).toBe("Ada signs in: a new key");

  await pressNextStep();

  expect(getTourStepTitle()).toBe("A rename keeps the key");
  expect(screen.getByText("Ada M.")).toBeTruthy();

  await press("End tour");

  expect(screen.queryByRole("region", { name: "Tour" })).toBe(null);
  expect(getSessionField("Key")).toBe(renamed);
});

test("the devtools mount in an open shadow root over the current Anchor, and follow it when the provider changes", async () => {
  await renderLab("firebase");

  const host = document.querySelector("[data-anchor-devtools]");

  expect(host?.shadowRoot?.mode).toBe("open");
  expect(
    host?.shadowRoot?.querySelector('button[aria-label="Open Anchor devtools"]')
      ?.textContent,
  ).toBe("Anchor");

  await selectProvider("Okta");

  expect(document.querySelectorAll("[data-anchor-devtools]")).toHaveLength(1);
  await act(async () => {
    host?.shadowRoot
      ?.querySelector<HTMLButtonElement>(
        'button[aria-label="Open Anchor devtools"]',
      )
      ?.click();
  });
  await settle();

  expect(host?.shadowRoot?.textContent).toContain("okta");
});
