import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WIDTHS = [375, 1280];

const open = async (page: Page, width: number) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sign in to Harbor" }),
  ).toBeVisible();

  return errors;
};

// Playwright prohibits a name on the definition role, so each value is found through its term.
const getSessionField = (page: Page, name: string) =>
  page
    .getByRole("region", { name: "Session" })
    .getByLabel(name, { exact: true });

const hasHorizontalScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

const getTour = (page: Page) => page.getByRole("region", { name: "Tour" });

for (const width of WIDTHS) {
  test(`the lab opens on Harbor's sign-in card and signs Ada in, with no page errors or horizontal scroll at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors = await open(page, width);

    await expect(getSessionField(page, "Status")).toHaveText("Signed out");
    await expect(hasHorizontalScroll(page)).resolves.toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`lab2-signed-out-${width}.png`),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Continue as Ada" }).click();
    await expect(
      page.getByRole("list", { name: "Project list" }),
    ).toContainText("Tide tables");
    await expect(getSessionField(page, "Status")).toHaveText("Signed in");
    await expect(hasHorizontalScroll(page)).resolves.toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`lab2-signed-in-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

for (const provider of ["Firebase", "Better Auth"]) {
  test(`the work tour runs to its end over ${provider}: Ada's slow request never reaches Grace, who sees only her own projects`, async ({
    page,
  }, testInfo) => {
    const errors = await open(page, 1280);

    await page.getByRole("combobox", { name: "Provider" }).selectOption({
      label: provider,
    });
    await expect(page.getByText(`On ${provider}:`)).toBeVisible();
    await page.getByRole("button", { name: "Tours" }).click();
    await page
      .getByRole("button", { name: "Start Work belongs to its session" })
      .click();

    const tour = getTour(page);
    const next = tour.getByRole("button", { name: /^(Next|Finish)$/ });

    await expect(
      tour.getByRole("heading", { name: "Ada signs in" }),
    ).toBeVisible();
    await expect(getSessionField(page, "Subject")).not.toHaveText("none");
    await next.click();
    await expect(
      tour.getByRole("heading", { name: "A slow request starts" }),
    ).toBeVisible();
    await next.click();
    await expect(page.getByText("Grace Okafor")).toBeVisible();
    await next.click();
    await expect(
      tour.getByRole("heading", { name: "The late answer changes nothing" }),
    ).toBeVisible();
    await expect(next).toBeEnabled({ timeout: 10_000 });
    await expect(
      page
        .getByRole("list", { name: "Timeline events" })
        .getByRole("listitem")
        .first(),
    ).toContainText(
      provider === "Firebase"
        ? "arrived after its session was gone, and Anchor discarded it."
        : "after that session was gone, so the list stays under its own key.",
    );
    await expect(
      page.getByRole("list", { name: "Project list" }),
    ).toContainText("Base camp logistics");
    await expect(
      page.getByRole("list", { name: "Project list" }),
    ).not.toContainText("Tide tables");
    await page.screenshot({
      path: testInfo.outputPath(
        `lab2-tour-${provider.replace(" ", "-")}-1280.png`,
      ),
      fullPage: true,
    });
    await next.click();
    await expect(tour).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("the devtools mount in an open shadow root, open over the same Anchor, show the timeline, and hide the principal until Show values", async ({
  page,
}) => {
  const errors = await open(page, 1280);
  // The panel inside the shadow root carries the attribute too, and the host comes first.
  const host = page.locator("[data-anchor-devtools]").first();

  await page.getByRole("button", { name: "Continue as Ada" }).click();
  await expect(getSessionField(page, "Subject")).toHaveText(
    "q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2",
  );
  await expect(
    host.evaluate((element) => element.shadowRoot?.mode ?? "none"),
  ).resolves.toBe("open");

  await page.getByRole("button", { name: "Open Anchor devtools" }).click();

  const panel = page.getByRole("complementary", { name: "Anchor devtools" });

  await expect(panel).toBeVisible();
  await expect(
    host.evaluate(
      (element) =>
        element.shadowRoot?.querySelector(
          'aside[aria-label="Anchor devtools"]',
        ) !== null,
    ),
  ).resolves.toBe(true);
  await expect(panel.getByLabel("Event timeline")).toContainText(
    "session accepted",
  );
  await expect(panel.getByText("principal hidden")).toBeVisible();
  await expect(panel).not.toContainText("q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2");

  await panel.getByRole("checkbox", { name: "Show values" }).check();

  await expect(panel).toContainText(
    "https://securetoken.google.com/harbor-lab · q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2",
  );
  await expect(panel.getByText("principal hidden")).toHaveCount(0);
  expect(errors).toEqual([]);
});
