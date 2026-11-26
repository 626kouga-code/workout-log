import { describe, expect, it } from "vitest";
import type { LocalSet, LocalWorkout } from "./local-db";
import { summarizeWorkout } from "./summary";

const workout: LocalWorkout = {
  id: "w",
  performedOn: "2026-11-26",
  startedAt: "2026-11-26T01:00:00.000Z",
  finishedAt: "2026-11-26T02:05:30.000Z",
  note: "",
  clientUpdatedAt: "2026-11-26T02:05:30.000Z",
};

const set = (fields: Partial<LocalSet>): LocalSet => ({
  id: "s",
  workoutExerciseId: "we",
  sortOrder: 0,
  weightKg: null,
  reps: null,
  durationSeconds: null,
  distanceM: null,
  completedAt: "2026-11-26T01:10:00.000Z",
  clientUpdatedAt: "2026-11-26T01:10:00.000Z",
  ...fields,
});

describe("ワークアウトの集計", () => {
  it("完了したセットの 重量×回数 を合計する", () => {
    const summary = summarizeWorkout(workout, 2, [
      set({ weightKg: 60, reps: 10 }),
      set({ weightKg: 62.5, reps: 8 }),
      // 未完了は数えない
      set({ weightKg: 100, reps: 10, completedAt: null }),
      // 重量のない自重は 0
      set({ reps: 20 }),
    ]);
    expect(summary).toEqual({
      volumeKg: 1100,
      durationMinutes: 65,
      exerciseCount: 2,
      completedSetCount: 3,
    });
  });

  it("記録中なら時間は null", () => {
    expect(
      summarizeWorkout({ ...workout, finishedAt: null }, 0, []).durationMinutes,
    ).toBeNull();
  });
});
