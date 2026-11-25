import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./helpers/auth";

/** 記録トップの「種目を選ぶ（試し）」から種目選択を開き、検索する */
async function openPickerAndSearch(page: Page, query: string) {
  await page.goto("/workouts");
  await page.getByRole("button", { name: "種目を選ぶ（試し）" }).click();
  const dialog = page.getByRole("dialog", { name: "種目を選ぶ" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "種目名で検索" }).fill(query);
  return dialog;
}

test("自分の種目を追加 → 名前を変える → 非表示 → 再表示して選べる", async ({
  page,
}) => {
  // 追加から再表示までを 1 本で通すため、手順が多い。制限時間を 3 倍にする
  test.slow();
  await signUp(page);
  await page.goto("/exercises");

  // 追加
  const add = page.getByRole("region", { name: "種目を追加" });
  await add.getByLabel("種目名").fill("フロントスクワット");
  await add.getByLabel("部位").selectOption({ label: "脚" });
  await add.getByRole("button", { name: "追加する" }).click();
  const own = page.getByRole("region", { name: "自分の種目" });
  await expect(own.getByText("フロントスクワット")).toBeVisible();

  // プリセットと同じ名前は追加できない
  await add.getByLabel("種目名").fill("ベンチプレス");
  await add.getByRole("button", { name: "追加する" }).click();
  await expect(add.getByText("同じ名前の種目があります")).toBeVisible();

  // 名前を変える
  await own.getByRole("button", { name: "フロントスクワットを編集" }).click();
  await own.getByLabel("種目名").fill("ゴブレットスクワット");
  await own.getByRole("button", { name: "保存する" }).click();
  await expect(own.getByText("ゴブレットスクワット")).toBeVisible();

  // 非表示にすると、種目選択に出ない
  await own
    .getByRole("button", { name: "ゴブレットスクワットを非表示" })
    .click();
  await expect(
    page.getByRole("region", { name: "非表示の種目" }).getByText(/ゴブレット/),
  ).toBeVisible();
  let dialog = await openPickerAndSearch(page, "ゴブレット");
  await expect(dialog.getByText("見つかりませんでした")).toBeVisible();

  // 再表示すると、種目選択で選べる
  await page.goto("/exercises");
  await page
    .getByRole("button", { name: "ゴブレットスクワットを再表示" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "自分の種目" })
      .getByText("ゴブレットスクワット"),
  ).toBeVisible();
  dialog = await openPickerAndSearch(page, "ごぶれっと");
  await dialog.getByRole("button", { name: /ゴブレットスクワット/ }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("選んだ種目：ゴブレットスクワット"),
  ).toBeVisible();
});

test("種目選択から自分の種目を追加すると、そのまま選ばれる", async ({
  page,
}) => {
  await signUp(page);
  const dialog = await openPickerAndSearch(page, "ハックスクワット");
  await expect(dialog.getByText("見つかりませんでした")).toBeVisible();

  await dialog.getByRole("button", { name: "自分の種目を追加" }).click();
  // 検索していた言葉が種目名に入っている
  // 「種目名で検索」と区別するため、ラベルは完全一致で探す
  await expect(dialog.getByLabel("種目名", { exact: true })).toHaveValue(
    "ハックスクワット",
  );
  await dialog
    .getByLabel("部位", { exact: true })
    .selectOption({ label: "脚" });
  await dialog.getByRole("button", { name: "追加して選ぶ" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("選んだ種目：ハックスクワット")).toBeVisible();
});

test("ログインしていなければ、種目の管理はログイン画面へ", async ({ page }) => {
  await page.goto("/exercises");
  await expect(page).toHaveURL("/login?next=%2Fexercises");
});
