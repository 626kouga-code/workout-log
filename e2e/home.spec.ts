import { expect, test } from "@playwright/test";
import { signUp } from "./helpers/auth";

const TABS = [
  { label: "記録", path: "/workouts" },
  { label: "進捗", path: "/progress" },
  { label: "通知", path: "/notifications" },
  { label: "プロフィール", path: "/profile" },
  { label: "ホーム", path: "/" },
];

test("ナビゲーションのタブで画面を行き来できる", async ({ page }) => {
  // 記録・進捗などはログインが必要なため、登録してから（登録後はホームが開く）
  await signUp(page);
  const nav = page.getByRole("navigation", { name: "メイン" });
  await expect(nav).toBeVisible();

  for (const { label, path } of TABS) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("heading", { level: 1, name: label }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("スマホでは画面下部、PC では左側にナビを出す", async ({
  page,
  isMobile,
}) => {
  await page.goto("/explore");
  const box = await page
    .getByRole("navigation", { name: "メイン" })
    .boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (isMobile) {
    // 画面の下端に、横幅いっぱいで付いている
    expect(Math.round(box!.y + box!.height)).toBe(viewport!.height);
    expect(Math.round(box!.width)).toBe(viewport!.width);
  } else {
    // 画面の左端に、高さいっぱいで付いている
    expect(box!.x).toBe(0);
    expect(Math.round(box!.height)).toBe(viewport!.height);
  }
});
