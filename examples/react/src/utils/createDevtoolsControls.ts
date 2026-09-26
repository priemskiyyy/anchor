import type { DevtoolsControls } from "example-shared/lab/types/DevtoolsControls";

const getDevtoolsRoot = (page: Document) =>
  page.querySelector("[data-anchor-devtools]")?.shadowRoot ?? null;

const clickButton = (page: Document, label: string) => {
  getDevtoolsRoot(page)
    ?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    ?.click();
};

/** Drives the real devtools the way a visitor would: through the controls in their shadow root. */
export const createDevtoolsControls = (page: Document): DevtoolsControls => ({
  open: () => clickButton(page, "Open Anchor devtools"),
  close: () => clickButton(page, "Close devtools"),
  showValues: () => {
    const labels = [
      ...(getDevtoolsRoot(page)?.querySelectorAll("label") ?? []),
    ];

    const input = labels
      .find(({ textContent }) => textContent?.trim() === "Show values")
      ?.querySelector("input");

    if (input === null || input === undefined || input.checked) {
      return;
    }

    input.click();
  },
});
