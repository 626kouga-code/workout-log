import { describe, expect, it } from "vitest";
import { formatWeightKg } from "./format";

describe("formatWeightKg", () => {
  it("整数はそのまま表示する", () => {
    expect(formatWeightKg(80)).toBe("80kg");
  });

  it("小数は不要な 0 を付けない", () => {
    expect(formatWeightKg(82.5)).toBe("82.5kg");
    expect(formatWeightKg(999.75)).toBe("999.75kg");
  });
});
