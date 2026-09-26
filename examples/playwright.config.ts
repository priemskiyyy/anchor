import { defineConfig, devices } from "@playwright/test";

const PREVIEWS = [
  { name: "react", port: 4380 },
  { name: "vue", port: 4381 },
  { name: "solid", port: 4382 },
  { name: "svelte", port: 4383 },
];

export default defineConfig({
  testDir: ".",
  testMatch: ["lab.spec.ts", "frameworks.spec.ts"],
  outputDir: "../.artifacts/example-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4380",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: PREVIEWS.map(({ name, port }) => ({
    command: `pnpm --filter example-${name} --config.verify-deps-before-run=false build && pnpm --filter example-${name} --config.verify-deps-before-run=false exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: "..",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  })),
});
