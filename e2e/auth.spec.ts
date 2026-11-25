import { expect, test } from "@playwright/test";
import { logIn, signUp } from "./helpers/auth";

test("登録 → ログアウト → ログインして元の画面に戻る", async ({ page }) => {
  const user = await signUp(page);

  // ログアウトすると、セッションが消えてログイン画面へ
  await page.goto("/profile");
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL("/login");

  // ログインが必要な画面は、ログイン画面へ回される
  await page.goto("/workouts");
  await expect(page).toHaveURL("/login?next=%2Fworkouts");

  // ログインすると、元の画面に戻る
  await logIn(page, user);
  await expect(page).toHaveURL("/workouts", { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "記録" }),
  ).toBeVisible();
});

test("未ログインでトップを開くと、全体タイムラインになる", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/explore");
  await expect(
    page.getByRole("heading", { level: 1, name: "みんなの投稿" }),
  ).toBeVisible();
});

test("パスワードが違うとログインできない", async ({ page, context }) => {
  const user = await signUp(page);
  await context.clearCookies();

  await page.goto("/login");
  await logIn(page, { ...user, password: "wrong-password" });
  // Next.js も画面の移動を読み上げる role="alert" の要素を置くため、main の中から探す
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "メールアドレスまたはパスワードが違います",
  );
  await expect(page).toHaveURL("/login");
});

test("新規登録の入力エラーを項目ごとに表示する", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill("not-an-email");
  await page.getByLabel("パスワード").fill("short");
  await page.getByLabel("ユーザーID").fill("ab");
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(
    page.getByText("メールアドレスの形式が正しくありません"),
  ).toBeVisible();
  await expect(
    page.getByText("パスワードは 8 文字以上で入力してください"),
  ).toBeVisible();
  await expect(
    page.getByText("ユーザーIDは半角英数字と _ で 3〜15 文字にしてください"),
  ).toBeVisible();
  await expect(page.getByText("表示名を入力してください")).toBeVisible();
  await expect(
    page.getByText("利用規約とプライバシーポリシーへの同意が必要です"),
  ).toBeVisible();
  await expect(page).toHaveURL("/signup");
});

test("使われているユーザーIDでは登録できない", async ({ page, context }) => {
  const user = await signUp(page);
  await context.clearCookies();

  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(`other-${user.email}`);
  await page.getByLabel("パスワード").fill("password123");
  await page.getByLabel("ユーザーID").fill(user.handle.toUpperCase());
  await page.getByLabel("表示名").fill("別の人");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(
    page.getByText("このユーザーIDはすでに使われています"),
  ).toBeVisible();
  await expect(page).toHaveURL("/signup");
});
