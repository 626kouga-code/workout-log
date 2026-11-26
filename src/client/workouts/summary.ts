import type { LocalSet, LocalWorkout } from "./local-db";

export type WorkoutSummary = {
  /** 総ボリューム（完了したセットの 重量 × 回数 の合計、kg） */
  volumeKg: number;
  /** 所要時間（分）。記録中なら null */
  durationMinutes: number | null;
  exerciseCount: number;
  /** 完了したセットの数 */
  completedSetCount: number;
};

/** ワークアウト完了画面（S-12）に出す集計 */
export function summarizeWorkout(
  workout: LocalWorkout,
  exerciseCount: number,
  sets: LocalSet[],
): WorkoutSummary {
  const completed = sets.filter((set) => set.completedAt !== null);
  const volumeKg = completed.reduce(
    (sum, set) =>
      set.weightKg !== null && set.reps !== null
        ? sum + set.weightKg * set.reps
        : sum,
    0,
  );
  const durationMinutes =
    workout.finishedAt === null
      ? null
      : Math.max(
          0,
          Math.floor(
            (Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) /
              60_000,
          ),
        );
  return {
    // 0.25kg 刻み × 整数回なので、小数の誤差を丸めておく
    volumeKg: Math.round(volumeKg * 100) / 100,
    durationMinutes,
    exerciseCount,
    completedSetCount: completed.length,
  };
}
