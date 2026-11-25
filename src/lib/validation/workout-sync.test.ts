import { describe, expect, it } from "vitest";
import {
  changeSchema,
  setDataSchema,
  syncRequestSchema,
  workoutDataSchema,
} from "./workout-sync";

const ID = "01a21000-8800-7000-8000-000000000000";
const AT = "2026-11-25T10:00:00.000Z";

const set = {
  workoutExerciseId: ID,
  sortOrder: 0,
  weightKg: 80,
  reps: 8,
  durationSeconds: null,
  distanceM: null,
  completedAt: null,
};

const setError = (patch: Partial<Record<keyof typeof set, unknown>>) => {
  const result = setDataSchema.safeParse({ ...set, ...patch });
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe("setDataSchema の境界値", () => {
  it("重量は 0〜999.75kg、0.25kg 刻み", () => {
    expect(setError({ weightKg: 0 })).toBeUndefined();
    expect(setError({ weightKg: 999.75 })).toBeUndefined();
    expect(setError({ weightKg: 62.5 })).toBeUndefined();
    expect(setError({ weightKg: 1000 })).toBe("重量は 999.75kg までです");
    expect(setError({ weightKg: -0.25 })).toBe("重量は 0kg 以上です");
    expect(setError({ weightKg: 80.1 })).toBe("重量は 0.25kg 刻みです");
  });

  it("回数は 1〜999 の整数", () => {
    expect(setError({ reps: 1 })).toBeUndefined();
    expect(setError({ reps: 999 })).toBeUndefined();
    expect(setError({ reps: 0 })).toBe("回数は 1 回以上です");
    expect(setError({ reps: 1000 })).toBe("回数は 999 回までです");
    expect(setError({ reps: 8.5 })).toBeDefined();
  });

  it("時間は 1 秒〜24 時間", () => {
    expect(setError({ durationSeconds: 86400 })).toBeUndefined();
    expect(setError({ durationSeconds: 86401 })).toBe("時間は 24 時間までです");
    expect(setError({ durationSeconds: 0 })).toBe("時間は 1 秒以上です");
  });
});

describe("workoutDataSchema", () => {
  const workout = {
    performedOn: "2026-11-25",
    startedAt: AT,
    finishedAt: null,
    note: "",
  };

  it("メモは 500 文字まで", () => {
    expect(
      workoutDataSchema.safeParse({ ...workout, note: "あ".repeat(500) })
        .success,
    ).toBe(true);
    expect(
      workoutDataSchema.safeParse({ ...workout, note: "あ".repeat(501) })
        .success,
    ).toBe(false);
  });

  it("実在しない日付は受け付けない", () => {
    expect(
      workoutDataSchema.safeParse({ ...workout, performedOn: "2026-02-30" })
        .success,
    ).toBe(false);
  });

  it("終了は開始より前にできない", () => {
    const result = workoutDataSchema.safeParse({
      ...workout,
      finishedAt: "2026-11-25T09:59:59.999Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("changeSchema", () => {
  it("upsert と delete を受け付け、日時は Date にする", () => {
    const parsed = changeSchema.parse({
      changeId: ID,
      id: ID,
      clientUpdatedAt: AT,
      entity: "set",
      op: "upsert",
      data: set,
    });
    expect(parsed.clientUpdatedAt).toEqual(new Date(AT));

    expect(
      changeSchema.safeParse({
        changeId: ID,
        id: ID,
        clientUpdatedAt: AT,
        entity: "workout",
        op: "delete",
      }).success,
    ).toBe(true);
  });

  it("entity と data の組み合わせが違えば受け付けない", () => {
    expect(
      changeSchema.safeParse({
        changeId: ID,
        id: ID,
        clientUpdatedAt: AT,
        entity: "workout",
        op: "upsert",
        data: set,
      }).success,
    ).toBe(false);
  });
});

describe("syncRequestSchema", () => {
  const change = { changeId: ID };

  it("200 件までは受け付け、201 件は受け付けない", () => {
    expect(
      syncRequestSchema.safeParse({ changes: Array(200).fill(change) }).success,
    ).toBe(true);
    expect(
      syncRequestSchema.safeParse({ changes: Array(201).fill(change) }).success,
    ).toBe(false);
  });

  it("中身が不正でも changeId があれば全体は受け付ける（1 件ずつ確かめるため）", () => {
    expect(
      syncRequestSchema.safeParse({
        changes: [{ changeId: ID, entity: "???" }],
      }).success,
    ).toBe(true);
  });

  it("changeId のない変更があれば全体を受け付けない", () => {
    expect(
      syncRequestSchema.safeParse({ changes: [{ entity: "set" }] }).success,
    ).toBe(false);
  });
});
