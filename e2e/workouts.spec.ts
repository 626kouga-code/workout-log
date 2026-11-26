import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./helpers/auth";
import { openPickerAndSearch, openWorkout } from "./helpers/workout";

async function addExercise(page: Page, name: string) {
  const dialog = await openPickerAndSearch(page, name);
  await dialog.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await expect(dialog).toBeHidden();
  return page.getByRole("region", { name });
}

test("ワークアウトを記録し、再読み込みしても残り、次回は前回の記録が初期値になる", async ({
  page,
}) => {
  test.slow();
  await signUp(page);
  await openWorkout(page);

  // 種目を追加して、セットを入力・完了する
  const bench = await addExercise(page, "ベンチプレス");
  await bench
    .getByRole("textbox", { name: "1セット目の重量（kg）" })
    .fill("60");
  await bench.getByRole("textbox", { name: "1セット目の回数" }).fill("10");
  await bench.getByRole("textbox", { name: "1セット目の回数" }).press("Enter");
  await bench.getByRole("button", { name: "1セット目を完了" }).click();
  await expect(
    bench.getByRole("button", { name: "1セット目を完了" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 直前のセットを複製して、+2.5kg
  await bench.getByRole("button", { name: "セットを追加" }).click();
  await bench
    .getByRole("button", { name: "2セット目の重量を2.5kg増やす" })
    .click();
  await expect(
    bench.getByRole("textbox", { name: "2セット目の重量（kg）" }),
  ).toHaveValue("62.5");
  await bench.getByRole("button", { name: "2セット目を完了" }).click();
  await expect(
    bench.getByRole("button", { name: "2セット目を完了" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 再読み込みしても残っている（端末に保存している）
  await page.reload();
  const reloaded = page.getByRole("region", { name: "ベンチプレス" });
  await expect(
    reloaded.getByRole("textbox", { name: "2セット目の重量（kg）" }),
  ).toHaveValue("62.5");
  await expect(
    reloaded.getByRole("button", { name: "1セット目を完了" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 終了すると完了画面へ
  await page.getByRole("button", { name: "ワークアウトを終了" }).click();
  await page
    .getByRole("group", { name: "終了の確認" })
    .getByRole("button", { name: "終了する" })
    .click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]{36}\/summary$/);
  // 60×10 + 62.5×10
  await expect(page.getByText("1,225 kg")).toBeVisible();
  await expect(page.getByText("2 セット")).toBeVisible();

  // 次のワークアウトでは、サーバーに送った前回の記録が初期値になる
  // 記録トップを開くと前回の記録を取り直すので、取り終えるのを待つ（人の操作より速く進むため）
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/workouts/offline-data") && response.ok(),
  );
  await page.getByRole("link", { name: "記録トップへ" }).click();
  await refreshed;
  await expect(
    page.getByRole("button", { name: "空のワークアウトを開始" }),
  ).toBeVisible();
  await openWorkout(page);
  const next = await addExercise(page, "ベンチプレス");
  await expect(next.getByText(/^前回（/)).toBeVisible();
  await expect(
    next.getByRole("textbox", { name: "1セット目の重量（kg）" }),
  ).toHaveValue("60");
  await expect(
    next.getByRole("textbox", { name: "2セット目の重量（kg）" }),
  ).toHaveValue("62.5");
  await expect(
    next.getByRole("button", { name: "1セット目を完了" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("ログインしていなければ、記録画面はログイン画面へ", async ({ page }) => {
  await page.goto("/workouts/0190a000-0000-7000-8000-000000000001");
  await expect(page).toHaveURL(/\/login\?next=/);
});
