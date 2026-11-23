import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // 失敗したテストは 1 回だけやり直す（docs/09_ci-cd.md）
  retries: 1,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // スマートフォン（iPhone 相当）と PC の 2 つの画面サイズで流す（docs/08_testing.md）
  projects: [
    { name: "mobile", use: { ...devices["iPhone 15"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // 本番ビルドに対して流す
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
