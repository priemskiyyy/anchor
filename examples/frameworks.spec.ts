import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const PAGES = [
  { name: "Vue", url: "http://127.0.0.1:4381/" },
  { name: "Solid", url: "http://127.0.0.1:4382/" },
  { name: "Svelte", url: "http://127.0.0.1:4383/" },
];

const open = async (page: Page, url: string, width: number) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
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

for (const { name, url } of PAGES) {
  test(`${name} signs Ada in through Firebase, carries her to Auth0 under a new key, and mounts the devtools`, async ({
    page,
  }) => {
    const errors = await open(page, url, 1280);

    await page.getByRole("button", { name: "Continue as Ada" }).click();
    await expect(getSessionField(page, "Authority")).toHaveText(
      "https://securetoken.google.com/harbor-lab",
    );

    const firebase = await getSessionField(page, "Key").textContent();

    await page
      .getByRole("combobox", { name: "Provider" })
      .selectOption("auth0");
    await expect(getSessionField(page, "Authority")).toHaveText(
      "https://harbor-lab.us.auth0.com/",
    );
    await expect(getSessionField(page, "Key")).not.toHaveText(firebase ?? "");
    await expect(
      page.getByRole("list", { name: "Project list" }),
    ).toContainText("Tide tables");
    await expect(
      page.getByRole("button", { name: "Open Anchor devtools" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`${name} fits a phone without horizontal scroll`, async ({
    page,
  }, testInfo) => {
    const errors = await open(page, url, 375);

    await expect(hasHorizontalScroll(page)).resolves.toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`lab2-${name.toLowerCase()}-375.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
