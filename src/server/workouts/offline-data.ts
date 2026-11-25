import "server-only";
import type { ExerciseItem } from "@/lib/exercise";
import { db } from "@/server/db";
import { listExercises } from "@/server/exercises/exercise-service";

/** 種目ごとの前回の記録（記録画面で初期値に使う。F-13） */
export type PreviousRecord = {
  exerciseId: string;
  /** 実施日 "YYYY-MM-DD" */
  performedOn: string;
  restSeconds: number;
  sets: {
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
    distanceM: number | null;
  }[];
};

export type OfflineData = {
  exercises: ExerciseItem[];
  previousRecords: PreviousRecord[];
  /** メニュー（#13 で作る。それまでは空） */
  routines: unknown[];
  /** 自己ベストの現在値（#16 で作る。それまでは空） */
  personalRecords: unknown[];
};

/**
 * 記録画面を圏外でも使うために、端末に保存しておくデータ（docs/06_api.md「記録中のデータの同期」）。
 * 記録トップを開いたときと、ワークアウトの終了後に取り直す。
 */
export async function getOfflineData(userId: string): Promise<OfflineData> {
  const [exercises, previousRecords] = await Promise.all([
    listExercises(userId),
    getPreviousRecords(userId),
  ]);
  return { exercises, previousRecords, routines: [], personalRecords: [] };
}

/**
 * 種目ごとに、終了済みで最も新しいワークアウトでの記録。
 * 同じワークアウトで同じ種目を 2 回行っていたら、並び順が先のほうを使う。
 */
export async function getPreviousRecords(
  userId: string,
): Promise<PreviousRecord[]> {
  // 種目ごとに 1 件を選ぶため、MySQL 8 のウィンドウ関数（ROW_NUMBER）を使う
  const latest = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT we.id,
        ROW_NUMBER() OVER (
          PARTITION BY we.exercise_id
          ORDER BY w.started_at DESC, we.sort_order ASC, we.id ASC
        ) AS rn
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = ${userId} AND w.finished_at IS NOT NULL
    ) ranked
    WHERE rn = 1`;
  if (latest.length === 0) return [];

  const rows = await db.workoutExercise.findMany({
    where: { id: { in: latest.map((row) => row.id) } },
    select: {
      exerciseId: true,
      restSeconds: true,
      workout: { select: { performedOn: true } },
      sets: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          weightKg: true,
          reps: true,
          durationSeconds: true,
          distanceM: true,
        },
      },
    },
  });
  return rows.map((row) => ({
    exerciseId: row.exerciseId,
    performedOn: row.workout.performedOn.toISOString().slice(0, 10),
    restSeconds: row.restSeconds,
    sets: row.sets.map((set) => ({
      weightKg: set.weightKg === null ? null : Number(set.weightKg),
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceM: set.distanceM,
    })),
  }));
}
