import { describe, expect, it } from "vitest";
import { isDateString, jstToday, jstWeekStart, toJstDate } from "./date";

describe("toJstDate", () => {
  it("日本時間の 0 時の直前は前の日（UTC 14:59:59.999）", () => {
    expect(toJstDate(new Date("2026-11-23T14:59:59.999Z"))).toBe("2026-11-23");
  });

  it("日本時間の 0 時ちょうどから次の日（UTC 15:00）", () => {
    expect(toJstDate(new Date("2026-11-23T15:00:00.000Z"))).toBe("2026-11-24");
  });

  it("年をまたぐ", () => {
    expect(toJstDate(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });

  it("jstToday は渡した時刻の日本時間の日付", () => {
    expect(jstToday(new Date("2026-02-28T16:00:00Z"))).toBe("2026-03-01");
  });
});

describe("jstWeekStart（月曜始まり）", () => {
  it("月曜はその日", () => {
    expect(jstWeekStart("2026-11-23")).toBe("2026-11-23"); // 月曜
  });

  it("日曜は前の月曜（週の最後の日）", () => {
    expect(jstWeekStart("2026-11-29")).toBe("2026-11-23"); // 日曜
  });

  it("月をまたぐ", () => {
    expect(jstWeekStart("2026-12-02")).toBe("2026-11-30"); // 水曜
  });

  it("年をまたぐ", () => {
    expect(jstWeekStart("2027-01-01")).toBe("2026-12-28"); // 金曜
  });

  it("日付の形式でなければエラー", () => {
    expect(() => jstWeekStart("2026/11/23")).toThrow(RangeError);
  });
});

describe("isDateString", () => {
  it("実在する日付", () => {
    expect(isDateString("2028-02-29")).toBe(true); // うるう年
  });

  it.each(["2026-02-29", "2026-13-01", "2026-1-1", "20261123", ""])(
    "%s は日付として扱わない",
    (value) => {
      expect(isDateString(value)).toBe(false);
    },
  );
});
