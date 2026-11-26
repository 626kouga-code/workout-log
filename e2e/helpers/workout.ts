import { expect, type Page } from "@playwright/test";

/** 記録トップから、空のワークアウトを開始する（記録中のものがあれば再開する） */
export async function openWorkout(page: Page): Promise<void> {
  await page.goto("/workouts");
  await page
    .getByRole("button", { name: "空のワークアウトを開始" })
    .or(page.getByRole("link", { name: "記録を再開" }))
    .click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "記録中" }),
  ).toBeVisible();
}

/** 記録画面の「種目を追加」から種目選択を開き、検索する */
export async function openPickerAndSearch(page: Page, query: string) {
  await page.getByRole("button", { name: "種目を追加" }).click();
  const dialog = page.getByRole("dialog", { name: "種目を選ぶ" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "種目名で検索" }).fill(query);
  return dialog;
}
