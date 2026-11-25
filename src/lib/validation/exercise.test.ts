import { describe, expect, it } from "vitest";
import { exerciseSchema } from "./exercise";

const valid = { name: "フロントスクワット", bodyPart: "LEGS", kind: "WEIGHT" };

const errorOf = (key: string, value: unknown) => {
  const result = exerciseSchema.safeParse({ ...valid, [key]: value });
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === key)?.message;
};

describe("exerciseSchema", () => {
  it("正しい入力を受け付け、名前の前後の空白を除く", () => {
    expect(exerciseSchema.parse({ ...valid, name: " スクワット " }).name).toBe(
      "スクワット",
    );
  });

  it("名前は 30 文字まで", () => {
    expect(errorOf("name", "あ".repeat(30))).toBeUndefined();
    expect(errorOf("name", "あ".repeat(31))).toBe(
      "種目名は 30 文字以内で入力してください",
    );
  });

  it("名前が空白だけなら受け付けない", () => {
    expect(errorOf("name", "   ")).toBe("種目名を入力してください");
  });

  it("知らない部位・種別は受け付けない", () => {
    expect(errorOf("bodyPart", "NECK")).toBe("部位を選んでください");
    expect(errorOf("kind", "STRETCH")).toBe("種別を選んでください");
  });
});
