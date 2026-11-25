import { expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

export type TestUser = {
  email: string;
  password: string;
  handle: string;
  displayName: string;
};

/** テストごとに重ならないユーザー（並列に流しても衝突しないよう、乱数を入れる） */
export function newTestUser(): TestUser {
  const suffix = randomBytes(5).toString("hex"); // 10 文字
  return {
    email: `e2e-${suffix}@example.com`,
    password: "password123",
    handle: `u_${suffix}`,
    displayName: `テスト ${suffix}`,
  };
}

/** 新規登録画面から登録する。登録後はログインした状態でホームが開く */
export async function signUp(
  page: Page,
  user: TestUser = newTestUser(),
): Promise<TestUser> {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByLabel("ユーザーID").fill(user.handle);
  await page.getByLabel("表示名").fill(user.displayName);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "登録する" }).click();
  // パスワードのハッシュ化（bcrypt）に時間がかかり、テストを並列に流すとさらに遅くなるため、長めに待つ
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "ホーム" }),
  ).toBeVisible();
  return user;
}

/** ログイン画面からログインする */
export async function logIn(page: Page, user: TestUser): Promise<void> {
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
}
