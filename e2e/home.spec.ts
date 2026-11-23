import { expect, test } from "@playwright/test";

test("トップ画面が開く", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Workout Log" }),
  ).toBeVisible();
});
