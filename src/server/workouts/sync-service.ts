import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ExerciseKind } from "@/lib/exercise";
import {
  changeSchema,
  type Change,
  type ChangeStatus,
  type SetData,
  type SyncEntity,
  type SyncResponse,
  type WorkoutData,
  type WorkoutExerciseData,
} from "@/lib/validation/workout-sync";
import { checkSetForKind } from "@/lib/workout-set";
import { db } from "@/server/db";
import { pickWorkoutsToFinish, resolveConflict } from "./conflict";

/** 反映済みの変更・削除の記録を覚えておく期間（docs/06_api.md） */
export const MEMORY_DAYS = 7;

type Tx = Prisma.TransactionClient;
type Result = { status: ChangeStatus; reason?: string };

/** 変更を受け付けられないとき（不正な値・他人のデータ・存在しない親）に投げる */
class Rejection extends Error {}

const NOT_FOUND = "見つかりません";

/**
 * 端末から送られた変更の一覧を、送られた順に 1 つのトランザクションで反映する（F-16）。
 * 変更ごとの結果（applied・duplicate・ignored・rejected）を返す。
 * 想定外のエラーのときは全体を取り消すので、端末は同じ変更をそのまま送り直せばよい。
 */
export async function applyChanges(
  userId: string,
  changes: { changeId: string }[],
  now: Date = new Date(),
): Promise<SyncResponse> {
  return db.$transaction(
    async (tx) => {
      await forgetOldRecords(tx, userId, now);
      const results: SyncResponse["results"] = [];
      for (const raw of changes) {
        results.push({
          changeId: raw.changeId,
          ...(await applyOne(tx, userId, raw, now)),
        });
      }
      const autoFinished = await finishExtraActiveWorkouts(tx, userId, now);
      return { results, autoFinished, personalRecords: [] };
    },
    // 200 件の変更を 1 回で反映するため、既定（5 秒）より長くする
    { maxWait: 10_000, timeout: 30_000 },
  );
}

async function applyOne(
  tx: Tx,
  userId: string,
  raw: { changeId: string },
  now: Date,
): Promise<Result> {
  // 先に changeId を覚える。すでにあれば二重送信なので何もしない（INSERT IGNORE なので同時に来ても 1 回だけ）
  const { count } = await tx.appliedChange.createMany({
    data: [{ changeId: raw.changeId, userId, appliedAt: now }],
    skipDuplicates: true,
  });
  if (count === 0) return { status: "duplicate" };

  const parsed = changeSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "rejected", reason: parsed.error.issues[0]?.message };
  }
  try {
    return { status: await applyChange(tx, userId, parsed.data, now) };
  } catch (error) {
    if (error instanceof Rejection) {
      return { status: "rejected", reason: error.message };
    }
    throw error;
  }
}

async function applyChange(
  tx: Tx,
  userId: string,
  change: Change,
  now: Date,
): Promise<ChangeStatus> {
  const { entity, id, clientUpdatedAt } = change;
  const existing = await findExisting(tx, entity, id);
  // 他人のデータは、存在を知らせないよう「見つからない」として断る
  if (existing && existing.userId !== userId) throw new Rejection(NOT_FOUND);

  const deleted = await isDeleted(tx, entity, id);
  const resolution = resolveConflict({
    op: change.op,
    incomingAt: clientUpdatedAt,
    existingAt: existing?.clientUpdatedAt ?? null,
    deleted,
  });

  switch (resolution) {
    case "ignore":
      return "ignored";
    case "tombstone":
      await remember(tx, userId, [{ entity, id }], now);
      return "applied";
    case "delete":
      return (await deleteEntity(tx, userId, entity, id, clientUpdatedAt, now))
        ? "applied"
        : "ignored";
    case "create":
    case "update":
      if (change.op !== "upsert") throw new Error("unreachable");
      return upsertEntity(tx, userId, change, resolution);
  }
}

// ---- 作成・更新 ----

async function upsertEntity(
  tx: Tx,
  userId: string,
  change: Extract<Change, { op: "upsert" }>,
  resolution: "create" | "update",
): Promise<ChangeStatus> {
  const { id, clientUpdatedAt } = change;
  // 条件付きの更新：今ある行より新しいときだけ書き換える（同時に届いても古いほうで上書きしない）
  const newer = { id, clientUpdatedAt: { lt: clientUpdatedAt } };

  switch (change.entity) {
    case "workout": {
      const data = { ...workoutColumns(change.data), clientUpdatedAt };
      if (resolution === "create") {
        await tx.workout.create({ data: { id, userId, ...data } });
        return "applied";
      }
      const { count } = await tx.workout.updateMany({ where: newer, data });
      return count > 0 ? "applied" : "ignored";
    }

    case "workoutExercise": {
      const parent = await checkParentWorkout(
        tx,
        userId,
        change.data.workoutId,
      );
      if (parent === "deleted") return "ignored";
      await checkExercise(tx, userId, change.data.exerciseId);
      const data = { ...workoutExerciseColumns(change.data), clientUpdatedAt };
      if (resolution === "create") {
        await tx.workoutExercise.create({ data: { id, ...data } });
        return "applied";
      }
      const { count } = await tx.workoutExercise.updateMany({
        where: newer,
        data,
      });
      return count > 0 ? "applied" : "ignored";
    }

    case "set": {
      const parent = await checkParentWorkoutExercise(
        tx,
        userId,
        change.data.workoutExerciseId,
      );
      if (parent === "deleted") return "ignored";
      const problem = checkSetForKind(
        parent.kind,
        change.data,
        change.data.completedAt !== null,
      );
      if (problem) throw new Rejection(problem);
      const data = { ...setColumns(change.data), clientUpdatedAt };
      if (resolution === "create") {
        await tx.workoutSet.create({ data: { id, ...data } });
        return "applied";
      }
      const { count } = await tx.workoutSet.updateMany({ where: newer, data });
      return count > 0 ? "applied" : "ignored";
    }
  }
}

function workoutColumns(data: WorkoutData) {
  return {
    // 日付だけの列（DATE）には、その日の 0 時（UTC）として渡す
    performedOn: new Date(`${data.performedOn}T00:00:00.000Z`),
    startedAt: data.startedAt,
    finishedAt: data.finishedAt,
    note: data.note,
  };
}

function workoutExerciseColumns(data: WorkoutExerciseData) {
  return {
    workoutId: data.workoutId,
    exerciseId: data.exerciseId,
    sortOrder: data.sortOrder,
    restSeconds: data.restSeconds,
  };
}

function setColumns(data: SetData) {
  return {
    workoutExerciseId: data.workoutExerciseId,
    sortOrder: data.sortOrder,
    weightKg: data.weightKg,
    reps: data.reps,
    durationSeconds: data.durationSeconds,
    distanceM: data.distanceM,
    completedAt: data.completedAt,
  };
}

/** 親のワークアウトが本人のものか。削除済みなら "deleted"（変更は無視する） */
async function checkParentWorkout(
  tx: Tx,
  userId: string,
  workoutId: string,
): Promise<"ok" | "deleted"> {
  const workout = await tx.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true },
  });
  if (workout) {
    if (workout.userId !== userId) throw new Rejection(NOT_FOUND);
    return "ok";
  }
  if (await isDeleted(tx, "workout", workoutId)) return "deleted";
  throw new Rejection("ワークアウトが見つかりません");
}

/** 親のワークアウトの種目が本人のものか。使う種目の種別も返す */
async function checkParentWorkoutExercise(
  tx: Tx,
  userId: string,
  workoutExerciseId: string,
): Promise<{ kind: ExerciseKind } | "deleted"> {
  const parent = await tx.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    select: {
      workout: { select: { userId: true } },
      exercise: { select: { kind: true } },
    },
  });
  if (parent) {
    if (parent.workout.userId !== userId) throw new Rejection(NOT_FOUND);
    return { kind: parent.exercise.kind as ExerciseKind };
  }
  if (await isDeleted(tx, "workoutExercise", workoutExerciseId)) {
    return "deleted";
  }
  throw new Rejection("ワークアウトの種目が見つかりません");
}

/** 使える種目（プリセットか自分の種目）か。非表示の種目も、過去の記録の編集のため使える */
async function checkExercise(
  tx: Tx,
  userId: string,
  exerciseId: string,
): Promise<void> {
  const exercise = await tx.exercise.findFirst({
    where: { id: exerciseId, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  });
  if (!exercise) throw new Rejection("種目が見つかりません");
}

// ---- 削除 ----

/**
 * 今ある行より新しい削除なら消し、子も含めて削除の記録を残す。
 * 子（種目・セット）の ID も覚えるのは、消したワークアウトのセットへの更新が遅れて届いても、
 * 「親が見つからない」ではなく「削除済み」として無視するため。
 */
async function deleteEntity(
  tx: Tx,
  userId: string,
  entity: SyncEntity,
  id: string,
  clientUpdatedAt: Date,
  now: Date,
): Promise<boolean> {
  const records = [{ entity, id }, ...(await listDescendants(tx, entity, id))];
  const where = { id, clientUpdatedAt: { lt: clientUpdatedAt } };
  const { count } =
    entity === "workout"
      ? await tx.workout.deleteMany({ where })
      : entity === "workoutExercise"
        ? await tx.workoutExercise.deleteMany({ where })
        : await tx.workoutSet.deleteMany({ where });
  if (count === 0) return false;
  await remember(tx, userId, records, now);
  return true;
}

async function listDescendants(
  tx: Tx,
  entity: SyncEntity,
  id: string,
): Promise<{ entity: SyncEntity; id: string }[]> {
  if (entity === "set") return [];
  const workoutExercises =
    entity === "workout"
      ? await tx.workoutExercise.findMany({
          where: { workoutId: id },
          select: { id: true },
        })
      : [];
  const sets = await tx.workoutSet.findMany({
    where: {
      workoutExerciseId: {
        in: entity === "workout" ? workoutExercises.map((we) => we.id) : [id],
      },
    },
    select: { id: true },
  });
  return [
    ...workoutExercises.map((we) => ({
      entity: "workoutExercise" as const,
      id: we.id,
    })),
    ...sets.map((set) => ({ entity: "set" as const, id: set.id })),
  ];
}

// ---- 共通 ----

/** 今ある行（持ち主と、端末で変更した時刻） */
async function findExisting(
  tx: Tx,
  entity: SyncEntity,
  id: string,
): Promise<{ userId: string; clientUpdatedAt: Date } | null> {
  switch (entity) {
    case "workout":
      return tx.workout.findUnique({
        where: { id },
        select: { userId: true, clientUpdatedAt: true },
      });
    case "workoutExercise": {
      const row = await tx.workoutExercise.findUnique({
        where: { id },
        select: {
          clientUpdatedAt: true,
          workout: { select: { userId: true } },
        },
      });
      return row
        ? { userId: row.workout.userId, clientUpdatedAt: row.clientUpdatedAt }
        : null;
    }
    case "set": {
      const row = await tx.workoutSet.findUnique({
        where: { id },
        select: {
          clientUpdatedAt: true,
          workoutExercise: {
            select: { workout: { select: { userId: true } } },
          },
        },
      });
      return row
        ? {
            userId: row.workoutExercise.workout.userId,
            clientUpdatedAt: row.clientUpdatedAt,
          }
        : null;
    }
  }
}

async function isDeleted(
  tx: Tx,
  entity: SyncEntity,
  id: string,
): Promise<boolean> {
  const record = await tx.deletedRecord.findUnique({
    where: { entity_id: { entity, id } },
    select: { id: true },
  });
  return record !== null;
}

/** 削除したことを覚えておく */
async function remember(
  tx: Tx,
  userId: string,
  records: { entity: SyncEntity; id: string }[],
  deletedAt: Date,
): Promise<void> {
  await tx.deletedRecord.createMany({
    data: records.map((record) => ({ ...record, userId, deletedAt })),
    skipDuplicates: true,
  });
}

/** 記録中が 2 件以上あれば、新しいもの以外を終了にする（記録中は 1 件まで） */
async function finishExtraActiveWorkouts(
  tx: Tx,
  userId: string,
  now: Date,
): Promise<string[]> {
  const active = await tx.workout.findMany({
    where: { userId, finishedAt: null },
    select: { id: true, startedAt: true },
  });
  const toFinish = pickWorkoutsToFinish(active);
  for (const { id, finishedAt } of toFinish) {
    await tx.workout.update({
      where: { id },
      data: { finishedAt, clientUpdatedAt: now },
    });
  }
  return toFinish.map((workout) => workout.id);
}

/** 7 日より古い「反映済みの変更」「削除の記録」を消す（定期実行の仕組みがまだないので、同期のついでに） */
async function forgetOldRecords(
  tx: Tx,
  userId: string,
  now: Date,
): Promise<void> {
  const before = new Date(now.getTime() - MEMORY_DAYS * 24 * 60 * 60 * 1000);
  await tx.appliedChange.deleteMany({
    where: { userId, appliedAt: { lt: before } },
  });
  await tx.deletedRecord.deleteMany({
    where: { userId, deletedAt: { lt: before } },
  });
}
