import { describe, expect, it } from "vitest";
import {
  formatKilometers,
  formatMinutes,
  parseKilometers,
  parseMinutes,
  parseReps,
  parseSeconds,
  parseWeight,
} from "./set-input";

describe("セットの入力欄", () => {
  it("重量は 0.25kg 刻み・0〜999.75kg に丸める", () => {
    expect(parseWeight("60")).toBe(60);
    expect(parseWeight("60.3")).toBe(60.25);
    expect(parseWeight("-5")).toBe(0);
    expect(parseWeight("1200")).toBe(999.75);
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
    expect(parseWeight("６０．５")).toBe(60.5);
  });

  it("回数は 1〜999 の整数。0 以下は未入力", () => {
    expect(parseReps("10")).toBe(10);
    expect(parseReps("9.6")).toBe(10);
    expect(parseReps("0")).toBeNull();
    expect(parseReps("5000")).toBe(999);
  });

  it("時間・距離の単位を変える", () => {
    expect(parseSeconds("45")).toBe(45);
    expect(parseMinutes("30")).toBe(1800);
    expect(parseMinutes("1.5")).toBe(90);
    expect(formatMinutes(90)).toBe("1.5");
    expect(parseKilometers("5.2")).toBe(5200);
    expect(formatKilometers(5200)).toBe("5.2");
  });
});
