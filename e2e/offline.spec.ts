import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./helpers/auth";
import { openPickerAndSearch, openWorkout } from "./helpers/workout";

/** 記録画面で種目を追加する */
async function addBench(page: Page) {
  const dialog = await openPickerAndSearch(page, "ベンチプレス");
  await dialog.getByRole("button", { name: /^ベンチプレス/ }).click();
  await expect(dialog).toBeHidden();
  return page.getByRole("region", { name: "ベンチプレス" });
}

test("圏外での記録：入力すると未送信が増え、通信が戻ると自動で送り、再読み込みしても残る", async ({
  page,
  context,
}) => {
  test.slow();
  await signUp(page);
  await openWorkout(page);
  const bench = await addBench(page);
  const status = page.getByRole("status").filter({ hasText: "未送信" });

  // 圏外にしてセットを入力・完了する
  await context.setOffline(true);
  await bench
    .getByRole("textbox", { name: "1セット目の重量（kg）" })
    .fill("70");
  await bench.getByRole("textbox", { name: "1セット目の回数" }).fill("5");
  await bench.getByRole("textbox", { name: "1セット目の回数" }).press("Enter");
  await bench.getByRole("button", { name: "1セット目を完了" }).click();
  await expect(status).toContainText(/未送信 [1-9]\d* 件/);
  await expect(status).toContainText("圏外です");

  // 通信が戻ると自動で送り、未送信の表示が消える
  await context.setOffline(false);
  await expect(status).toBeHidden();

  // 再読み込みしても残っている
  await page.reload();
  const reloaded = page.getByRole("region", { name: "ベンチプレス" });
  await expect(
    reloaded.getByRole("textbox", { name: "1セット目の重量（kg）" }),
  ).toHaveValue("70");
  await expect(
    reloaded.getByRole("button", { name: "1セット目を完了" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test.describe("Service Worker を使う", () => {
  test.use({ serviceWorkers: "allow" });

  test("圏外でも記録画面を開き直せ、ほかの画面には「記録中」のバーが出る", async ({
    page,
    context,
  }) => {
    test.slow();
    await signUp(page);
    await openWorkout(page);
    await addBench(page);
    // Service Worker が動き出し、記録画面を保存するまで待つ
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(
      page.getByRole("region", { name: "ベンチプレス" }),
    ).toBeVisible();

    // 圏外のまま開き直しても、記録画面が表示される
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "記録中" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "ベンチプレス" }),
    ).toBeVisible();

    // 通信を戻してほかの画面へ行くと、「記録中」のバーから記録画面に戻れる
    await context.setOffline(false);
    await page.goto("/exercises");
    await page.getByRole("link", { name: /記録中/ }).click();
    await expect(page).toHaveURL("/workouts/current");
  });
});
