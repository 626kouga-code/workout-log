import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it.each(["/", "/workouts", "/profile?tab=posts", "/users/taro#top"])(
    "自サイト内のパス %j はそのまま使う",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    ["指定なし", null],
    ["空", ""],
    ["外部 URL", "https://evil.example.com"],
    ["プロトコル省略の外部 URL", "//evil.example.com"],
    ["バックスラッシュ", "/\\evil.example.com"],
    ["相対パス", "workouts"],
    ["改行入り", "/a\r\nSet-Cookie: x=1"],
  ])("%s（%j）はホームにする", (_, path) => {
    expect(safeNextPath(path)).toBe("/");
  });
});
