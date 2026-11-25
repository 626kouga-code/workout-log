import { describe, expect, it } from "vitest";
import { checkSetForKind, type SetFields } from "./workout-set";

const empty: SetFields = {
  weightKg: null,
  reps: null,
  durationSeconds: null,
  distanceM: null,
};

describe("checkSetForKind", () => {
  it.each([
    ["重量：重量と回数", "WEIGHT", { weightKg: 80, reps: 8 }],
    ["自重：回数だけ", "BODYWEIGHT", { reps: 10 }],
    ["自重：加重あり", "BODYWEIGHT", { weightKg: 10, reps: 10 }],
    ["時間：秒数だけ", "TIMED", { durationSeconds: 60 }],
    ["時間：加重あり", "TIMED", { weightKg: 5, durationSeconds: 60 }],
    ["有酸素：時間だけ", "CARDIO", { durationSeconds: 1800 }],
    ["有酸素：距離あり", "CARDIO", { durationSeconds: 1800, distanceM: 5000 }],
  ] as const)("完了したセット %s は OK", (_, kind, set) => {
    expect(checkSetForKind(kind, { ...empty, ...set }, true)).toBeNull();
  });

  it.each([
    [
      "有酸素に回数",
      "CARDIO",
      { durationSeconds: 60, reps: 1 },
      "有酸素の種目に回数は入れられません",
    ],
    [
      "重量種目に時間",
      "WEIGHT",
      { weightKg: 80, reps: 8, durationSeconds: 60 },
      "重量の種目に時間は入れられません",
    ],
    [
      "時間種目に回数",
      "TIMED",
      { durationSeconds: 60, reps: 1 },
      "時間の種目に回数は入れられません",
    ],
    [
      "有酸素に重量",
      "CARDIO",
      { durationSeconds: 60, weightKg: 1 },
      "有酸素の種目に重量は入れられません",
    ],
  ] as const)("%s は入れられない（未完了でも）", (_, kind, set, message) => {
    expect(checkSetForKind(kind, { ...empty, ...set }, false)).toBe(message);
  });

  it("未完了なら、必須の項目が空でもよい（値を入れる前のセット）", () => {
    expect(checkSetForKind("WEIGHT", empty, false)).toBeNull();
  });

  it.each([
    [
      "重量種目で重量なし",
      "WEIGHT",
      { reps: 8 },
      "完了にするには重量を入れてください",
    ],
    [
      "重量種目で回数なし",
      "WEIGHT",
      { weightKg: 80 },
      "完了にするには回数を入れてください",
    ],
    ["自重で回数なし", "BODYWEIGHT", {}, "完了にするには回数を入れてください"],
    ["時間種目で秒数なし", "TIMED", {}, "完了にするには時間を入れてください"],
    [
      "有酸素で時間なし",
      "CARDIO",
      { distanceM: 5000 },
      "完了にするには時間を入れてください",
    ],
  ] as const)("完了にするとき、%s は不可", (_, kind, set, message) => {
    expect(checkSetForKind(kind, { ...empty, ...set }, true)).toBe(message);
  });
});
