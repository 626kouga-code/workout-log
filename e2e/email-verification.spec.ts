import { expect, test } from "@playwright/test";
import { signUp } from "./helpers/auth";
import { verificationLink } from "./helpers/mailpit";

const banner = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "メールアドレスの確認" });

test("登録 → 確認メールのリンクを開いて確認 → 未確認の帯が消える", async ({
  page,
}) => {
  const user = await signUp(page);
  await expect(banner(page)).toBeVisible();

  // Mailpit に届いた確認メールのリンクを開き、ボタンを押して確定する
  await page.goto(await verificationLink(user.email));
  await page.getByRole("button", { name: "メールアドレスを確認する" }).click();
  await expect(
    page.getByRole("heading", { name: "メールアドレスを確認しました" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "ホーム" }),
  ).toBeVisible();
  await expect(banner(page)).toHaveCount(0);

  // 同じリンクは 2 回使えない
  await page.goto(await verificationLink(user.email));
  await page.getByRole("button", { name: "メールアドレスを確認する" }).click();
  await expect(
    page.getByRole("heading", { name: "このリンクはすでに使われています" }),
  ).toBeVisible();
});

test("確認メールの再送は 1 分に 1 回まで", async ({ page }) => {
  await signUp(page);
  // 登録したときに 1 通送っているので、すぐに再送すると断られる
  await banner(page).getByRole("button", { name: "確認メールを再送" }).click();
  await expect(banner(page).getByRole("status")).toHaveText(
    "確認メールは 1 分に 1 回まで送れます。しばらく待ってからやり直してください",
  );
});

test("正しくないリンクでは確認できない", async ({ page }) => {
  await page.goto("/verify-email?token=not-a-real-token");
  await page.getByRole("button", { name: "メールアドレスを確認する" }).click();
  await expect(
    page.getByRole("heading", { name: "リンクが正しくありません" }),
  ).toBeVisible();
});
