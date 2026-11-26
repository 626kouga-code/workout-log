import Dexie, { type EntityTable } from "dexie";
import type { ExerciseItem } from "@/lib/exercise";
import type { ChangeInput } from "@/lib/validation/workout-sync";
import type { SetFields } from "@/lib/workout-set";
import type { PreviousRecord } from "@/server/workouts/offline-data";

/**
 * 端末（ブラウザの IndexedDB）に保存するデータ（F-16、docs/06_api.md「記録中のデータの同期」）。
 * 記録中は端末のデータが正で、画面はここを読んで表示する。サーバーへは送信待ち（outbox）から送る。
 * 日時は ISO 8601 の文字列で持つ（同期 API にそのまま送れる形）。
 */

export type LocalWorkout = {
  id: string;
  /** 実施日（日本時間の "YYYY-MM-DD"） */
  performedOn: string;
  startedAt: string;
  /** null なら記録中 */
  finishedAt: string | null;
  note: string;
  clientUpdatedAt: string;
};

export type LocalWorkoutExercise = {
  id: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  restSeconds: number;
  clientUpdatedAt: string;
};

export type LocalSet = SetFields & {
  id: string;
  workoutExerciseId: string;
  sortOrder: number;
  /** 「完了」にした日時。null なら未完了 */
  completedAt: string | null;
  clientUpdatedAt: string;
};

/** 送信待ちの変更。seq（追加順の番号）の順に送る */
export type OutboxItem = {
  seq: number;
  change: ChangeInput;
};

type MetaItem = { key: string; value: string };

export class LocalDb extends Dexie {
  workouts!: EntityTable<LocalWorkout, "id">;
  workoutExercises!: EntityTable<LocalWorkoutExercise, "id">;
  sets!: EntityTable<LocalSet, "id">;
  /** 種目（GET /api/workouts/offline-data の写し） */
  exercises!: EntityTable<ExerciseItem, "id">;
  /** 種目ごとの前回の記録（同上） */
  previousRecords!: EntityTable<PreviousRecord, "exerciseId">;
  outbox!: EntityTable<OutboxItem, "seq">;
  meta!: EntityTable<MetaItem, "key">;

  constructor() {
    super("workout-log");
    this.version(1).stores({
      workouts: "id",
      workoutExercises: "id, workoutId",
      sets: "id, workoutExerciseId",
      exercises: "id",
      previousRecords: "exerciseId",
      outbox: "++seq",
      meta: "key",
    });
  }
}

export const localDb = new LocalDb();

/**
 * 端末のデータが、ログイン中のユーザーのものかを確かめる。
 * 別のユーザーのデータが残っていたら消す（端末には本人の記録だけを置く。docs/03）。
 * ログアウト時に送ってから消す処理は #10 で作る。
 */
export async function ensureOwner(userId: string): Promise<void> {
  await localDb.transaction("rw", localDb.tables, async () => {
    const owner = await localDb.meta.get("userId");
    if (owner?.value === userId) return;
    if (owner) {
      await Promise.all(
        localDb.tables
          .filter((table) => table !== localDb.meta)
          .map((table) => table.clear()),
      );
    }
    await localDb.meta.put({ key: "userId", value: userId });
  });
}
