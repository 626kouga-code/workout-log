import { describe, expect, it } from "vitest";
import { matchesSearch } from "./search";

describe("matchesSearch", () => {
  it.each([
    ["部分一致", "ベンチプレス", "プレス"],
    ["ひらがなで探す", "ベンチプレス", "べんち"],
    ["大文字小文字", "EZ Bar Curl", "ez bar"],
    ["全角英字", "EZバーカール", "ＥＺ"],
    ["空の検索語は全部に一致", "ベンチプレス", "  "],
  ])("%s", (_, text, query) => {
    expect(matchesSearch(text, query)).toBe(true);
  });

  it("含まれていなければ一致しない", () => {
    expect(matchesSearch("ベンチプレス", "スクワット")).toBe(false);
  });
});
