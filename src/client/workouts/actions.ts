import type { ExerciseItem, ExerciseKind } from "@/lib/exercise";
import { jstToday } from "@/lib/date";
import { newId } from "@/lib/id";
import {
  NOTE_MAX_LENGTH,
  SORT_ORDER_MAX,
  type ChangeInput,
  type SyncEntity,
} from "@/lib/validation/workout-sync";
import { checkSetForKind, SET_RULES, type SetFields } from "@/lib/workout-set";
import {
  localDb,
  type LocalSet,
  type LocalWorkout,
  type LocalWorkoutExercise,
} from "./local-db";
import { enqueue } from "./outbox";
import { clampWeight } from "./set-input";

/**
 * 記録画面からの操作（F-12, F-13）。
 * どれも「端末のデータを書き換える」と「送信待ちに変更を積む」を 1 つのトランザクションで行う。
 * サーバーへの送信は、呼んだ側が flushOutbox() で行う。
 *
 * 入力欄から離れた直後にボタンを押すと、2 つの操作が続けて走る。
 * IndexedDB は同じテーブルを書き換えるトランザクションを始めた順に実行するので、
 * どの操作も、最初の await より前にトランザクションを始めている。
 */

export const DEFAULT_REST_SECONDS = 90;

const tables = () => [
  localDb.workouts,
  localDb.workoutExercises,
  localDb.sets,
  localDb.exercises,
  localDb.outbox,
];

let lastStamp = 0;

/**
 * 変更した時刻（clientUpdatedAt）。サーバーは新しいほうを採用するので、
 * 同じミリ秒に続けて操作しても、前の値より必ず後になるようにする。
 */
export function nextStamp(previous?: string): string {
  const floor = previous ? Date.parse(previous) + 1 : 0;
  lastStamp = Math.max(Date.now(), lastStamp + 1, floor);
  return new Date(lastStamp).toISOString();
}

function workoutChange(workout: LocalWorkout): ChangeInput {
  return {
    changeId: newId(),
    id: workout.id,
    clientUpdatedAt: workout.clientUpdatedAt,
    entity: "workout",
    op: "upsert",
    data: {
      performedOn: workout.performedOn,
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt,
      note: workout.note,
    },
  };
}

function workoutExerciseChange(item: LocalWorkoutExercise): ChangeInput {
  return {
    changeId: newId(),
    id: item.id,
    clientUpdatedAt: item.clientUpdatedAt,
    entity: "workoutExercise",
    op: "upsert",
    data: {
      workoutId: item.workoutId,
      exerciseId: item.exerciseId,
      sortOrder: item.sortOrder,
      restSeconds: item.restSeconds,
    },
  };
}

function setChange(set: LocalSet): ChangeInput {
  return {
    changeId: newId(),
    id: set.id,
    clientUpdatedAt: set.clientUpdatedAt,
    entity: "set",
    op: "upsert",
    data: {
      workoutExerciseId: set.workoutExerciseId,
      sortOrder: set.sortOrder,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceM: set.distanceM,
      completedAt: set.completedAt,
    },
  };
}

function deleteChange(entity: SyncEntity, id: string): ChangeInput {
  return {
    changeId: newId(),
    id,
    clientUpdatedAt: nextStamp(),
    entity,
    op: "delete",
  };
}

const bySortOrder = <T extends { sortOrder: number; id: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);

async function setsOf(workoutExerciseId: string): Promise<LocalSet[]> {
  const sets = await localDb.sets
    .where("workoutExerciseId")
    .equals(workoutExerciseId)
    .toArray();
  return sets.sort(bySortOrder);
}

async function exercisesOf(workoutId: string): Promise<LocalWorkoutExercise[]> {
  const items = await localDb.workoutExercises
    .where("workoutId")
    .equals(workoutId)
    .toArray();
  return items.sort(bySortOrder);
}

/** セットが属する種目の種別 */
async function kindOfSet(set: LocalSet): Promise<ExerciseKind | undefined> {
  const item = await localDb.workoutExercises.get(set.workoutExerciseId);
  if (!item) return undefined;
  return (await localDb.exercises.get(item.exerciseId))?.kind;
}

async function getOrThrow<T>(
  promise: Promise<T | undefined>,
  what: string,
): Promise<T> {
  const value = await promise;
  if (value === undefined) throw new Error(`${what}が見つかりません`);
  return value;
}

/** 記録中のワークアウト（記録中は 1 件まで） */
export async function findInProgressWorkout(): Promise<
  LocalWorkout | undefined
> {
  const workouts = await localDb.workouts
    .filter((workout) => workout.finishedAt === null)
    .toArray();
  return workouts.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

/** 空のワークアウトを始める。記録中のものがあれば、それを返す */
export function startWorkout(now: Date = new Date()): Promise<LocalWorkout> {
  return localDb.transaction("rw", tables(), async () => {
    const current = await findInProgressWorkout();
    if (current) return current;
    const workout: LocalWorkout = {
      id: newId(),
      performedOn: jstToday(now),
      startedAt: now.toISOString(),
      finishedAt: null,
      note: "",
      clientUpdatedAt: nextStamp(),
    };
    await localDb.workouts.add(workout);
    await enqueue(workoutChange(workout));
    return workout;
  });
}

async function updateWorkout(
  id: string,
  update: (workout: LocalWorkout) => Partial<LocalWorkout>,
): Promise<void> {
  await localDb.transaction("rw", tables(), async () => {
    const workout = await getOrThrow(localDb.workouts.get(id), "ワークアウト");
    const next: LocalWorkout = {
      ...workout,
      ...update(workout),
      clientUpdatedAt: nextStamp(workout.clientUpdatedAt),
    };
    await localDb.workouts.put(next);
    await enqueue(workoutChange(next));
  });
}

export function finishWorkout(id: string, now: Date = new Date()) {
  return updateWorkout(id, (workout) => ({
    // 端末の時計がずれていても、開始より前にはしない
    finishedAt:
      now.toISOString() > workout.startedAt
        ? now.toISOString()
        : workout.startedAt,
  }));
}

export function updateNote(id: string, note: string) {
  return updateWorkout(id, () => ({ note: note.slice(0, NOTE_MAX_LENGTH) }));
}

/** 前回の記録のうち、今の種別で使える項目だけを残す */
function pickAllowed(kind: ExerciseKind, fields: SetFields): SetFields {
  const allowed = SET_RULES[kind].allowed;
  return {
    weightKg: allowed.includes("weightKg") ? fields.weightKg : null,
    reps: allowed.includes("reps") ? fields.reps : null,
    durationSeconds: allowed.includes("durationSeconds")
      ? fields.durationSeconds
      : null,
    distanceM: allowed.includes("distanceM") ? fields.distanceM : null,
  };
}

const EMPTY_SET: SetFields = {
  weightKg: null,
  reps: null,
  durationSeconds: null,
  distanceM: null,
};

/**
 * 種目を追加する。前回の記録があれば、そのセット数と値を初期値にする（F-13）。
 * なければ空のセットを 1 つ作る。
 */
export function addExercise(
  workoutId: string,
  exercise: ExerciseItem,
): Promise<LocalWorkoutExercise> {
  return localDb.transaction(
    "rw",
    [...tables(), localDb.previousRecords],
    async () => {
      // 種目選択で新しく作った種目も、端末の種目に入れておく
      await localDb.exercises.put(exercise);
      const existing = await exercisesOf(workoutId);
      const sortOrder =
        existing.length === 0 ? 0 : existing[existing.length - 1].sortOrder + 1;
      if (sortOrder > SORT_ORDER_MAX) {
        throw new Error("これ以上、種目を追加できません");
      }
      const previous = await localDb.previousRecords.get(exercise.id);
      const stamp = nextStamp();
      const item: LocalWorkoutExercise = {
        id: newId(),
        workoutId,
        exerciseId: exercise.id,
        sortOrder,
        restSeconds: previous?.restSeconds ?? DEFAULT_REST_SECONDS,
        clientUpdatedAt: stamp,
      };
      const values =
        previous && previous.sets.length > 0 ? previous.sets : [EMPTY_SET];
      const sets: LocalSet[] = values
        .slice(0, SORT_ORDER_MAX + 1)
        .map((fields, index) => ({
          ...pickAllowed(exercise.kind, fields),
          id: newId(),
          workoutExerciseId: item.id,
          sortOrder: index,
          completedAt: null,
          clientUpdatedAt: stamp,
        }));
      await localDb.workoutExercises.add(item);
      await localDb.sets.bulkAdd(sets);
      await enqueue(workoutExerciseChange(item), ...sets.map(setChange));
      return item;
    },
  );
}

/** 種目の順番を 1 つ上（-1）か下（+1）へ動かす */
export function moveExercise(
  workoutExerciseId: string,
  direction: -1 | 1,
): Promise<void> {
  return localDb.transaction("rw", tables(), async () => {
    const item = await getOrThrow(
      localDb.workoutExercises.get(workoutExerciseId),
      "種目",
    );
    const items = await exercisesOf(item.workoutId);
    const from = items.findIndex((other) => other.id === workoutExerciseId);
    const to = from + direction;
    if (to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    // 並び順が同じ値のものがあっても崩れないように、0 から振り直し、変わったものだけ送る
    const changed = items
      .map((other, index) => ({ other, index }))
      .filter(({ other, index }) => other.sortOrder !== index)
      .map(({ other, index }) => ({
        ...other,
        sortOrder: index,
        clientUpdatedAt: nextStamp(other.clientUpdatedAt),
      }));
    await localDb.workoutExercises.bulkPut(changed);
    await enqueue(...changed.map(workoutExerciseChange));
  });
}

/** 種目を削除する。セットはサーバーでも一緒に消えるので、送るのは種目の削除だけ */
export function removeExercise(workoutExerciseId: string): Promise<void> {
  return localDb.transaction("rw", tables(), async () => {
    await localDb.sets
      .where("workoutExerciseId")
      .equals(workoutExerciseId)
      .delete();
    await localDb.workoutExercises.delete(workoutExerciseId);
    await enqueue(deleteChange("workoutExercise", workoutExerciseId));
  });
}

/** セットを追加する。直前のセットの値を複製する（F-13） */
export function addSet(workoutExerciseId: string): Promise<LocalSet> {
  return localDb.transaction("rw", tables(), async () => {
    const item = await getOrThrow(
      localDb.workoutExercises.get(workoutExerciseId),
      "種目",
    );
    const sets = await setsOf(item.id);
    const last = sets[sets.length - 1];
    const sortOrder = last ? last.sortOrder + 1 : 0;
    if (sortOrder > SORT_ORDER_MAX) {
      throw new Error("これ以上、セットを追加できません");
    }
    const set: LocalSet = {
      ...(last
        ? {
            weightKg: last.weightKg,
            reps: last.reps,
            durationSeconds: last.durationSeconds,
            distanceM: last.distanceM,
          }
        : EMPTY_SET),
      id: newId(),
      workoutExerciseId: item.id,
      sortOrder,
      completedAt: null,
      clientUpdatedAt: nextStamp(),
    };
    await localDb.sets.add(set);
    await enqueue(setChange(set));
    return set;
  });
}

async function writeSet(
  set: LocalSet,
  update: Partial<LocalSet>,
): Promise<LocalSet> {
  const next: LocalSet = {
    ...set,
    ...update,
    clientUpdatedAt: nextStamp(set.clientUpdatedAt),
  };
  await localDb.sets.put(next);
  await enqueue(setChange(next));
  return next;
}

/**
 * セットの値を変える。値が変わらなければ何もしない。
 * 完了済みのセットで必須の項目を空にしたら、未完了に戻す（サーバーが受け付けない形にしない）。
 */
export function updateSet(
  setId: string,
  fields: Partial<SetFields>,
): Promise<void> {
  return localDb.transaction("rw", tables(), async () => {
    const set = await getOrThrow(localDb.sets.get(setId), "セット");
    const merged = { ...set, ...fields };
    const unchanged = (Object.keys(fields) as (keyof SetFields)[]).every(
      (key) => merged[key] === set[key],
    );
    if (unchanged) return;
    const kind = await kindOfSet(set);
    const stillComplete =
      set.completedAt !== null &&
      kind !== undefined &&
      checkSetForKind(kind, merged, true) === null;
    await writeSet(set, {
      ...fields,
      completedAt: stillComplete ? set.completedAt : null,
    });
  });
}

/** 重量を delta kg だけ増減する（±2.5kg ボタン。F-13）。0〜999.75kg の範囲に収める */
export function stepWeight(setId: string, delta: number): Promise<void> {
  return localDb.transaction("rw", tables(), async () => {
    const set = await getOrThrow(localDb.sets.get(setId), "セット");
    const weightKg = clampWeight((set.weightKg ?? 0) + delta);
    if (weightKg === set.weightKg) return;
    await writeSet(set, { weightKg });
  });
}

/**
 * 「完了」を切り替える。完了にするのに必要な項目が空なら、変えずに理由を返す。
 */
export function toggleComplete(
  setId: string,
  now: Date = new Date(),
): Promise<string | null> {
  return localDb.transaction("rw", tables(), async () => {
    const set = await getOrThrow(localDb.sets.get(setId), "セット");
    if (set.completedAt !== null) {
      await writeSet(set, { completedAt: null });
      return null;
    }
    const kind = await kindOfSet(set);
    if (kind) {
      const error = checkSetForKind(kind, set, true);
      if (error) return error;
    }
    await writeSet(set, { completedAt: now.toISOString() });
    return null;
  });
}

export function removeSet(setId: string): Promise<void> {
  return localDb.transaction("rw", tables(), async () => {
    await localDb.sets.delete(setId);
    await enqueue(deleteChange("set", setId));
  });
}
