import { beforeEach, describe, expect, it } from "vitest";
import type { ChangeInput } from "@/lib/validation/workout-sync";
import {
  addExercise,
  addSet,
  finishWorkout,
  moveExercise,
  nextStamp,
  removeExercise,
  startWorkout,
  stepWeight,
  toggleComplete,
  updateSet,
} from "./actions";
import { localDb } from "./local-db";
import { BENCH, clearLocalDb, PUSH_UP } from "./test-helpers";

async function outbox(): Promise<ChangeInput[]> {
  return (await localDb.outbox.orderBy("seq").toArray()).map(
    (item) => item.change,
  );
}

async function setsOf(workoutExerciseId: string) {
  return (
    await localDb.sets
      .where("workoutExerciseId")
      .equals(workoutExerciseId)
      .toArray()
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

beforeEach(async () => {
  await clearLocalDb();
  await localDb.exercises.bulkPut([BENCH, PUSH_UP]);
});

describe("ワークアウトの開始・終了", () => {
  it("開始すると端末に保存し、送信待ちに積む", async () => {
    // 日本時間では 11/26 0:30
    const now = new Date("2026-11-25T15:30:00Z");
    const workout = await startWorkout(now);
    expect(workout).toMatchObject({
      performedOn: "2026-11-26",
      startedAt: now.toISOString(),
      finishedAt: null,
      note: "",
    });
    expect(await localDb.workouts.get(workout.id)).toEqual(workout);
    expect(await outbox()).toEqual([
      expect.objectContaining({
        entity: "workout",
        op: "upsert",
        id: workout.id,
      }),
    ]);
  });

  it("記録中のものがあれば、新しく作らずにそれを返す", async () => {
    const first = await startWorkout();
    const second = await startWorkout();
    expect(second.id).toBe(first.id);
    expect(await localDb.workouts.count()).toBe(1);
  });

  it("終了すると終了時刻を入れて送る", async () => {
    const workout = await startWorkout(new Date("2026-11-26T01:00:00Z"));
    await finishWorkout(workout.id, new Date("2026-11-26T02:00:00Z"));
    const changes = await outbox();
    expect(changes.at(-1)).toMatchObject({
      entity: "workout",
      data: { finishedAt: "2026-11-26T02:00:00.000Z" },
    });
  });
});

describe("種目の追加", () => {
  it("前回の記録があれば、そのセット数と値で未完了のセットを作る", async () => {
    await localDb.previousRecords.put({
      exerciseId: BENCH.id,
      performedOn: "2026-11-20",
      restSeconds: 120,
      sets: [
        { weightKg: 60, reps: 10, durationSeconds: null, distanceM: null },
        { weightKg: 62.5, reps: 8, durationSeconds: null, distanceM: null },
      ],
    });
    const workout = await startWorkout();
    const item = await addExercise(workout.id, BENCH);

    expect(item.restSeconds).toBe(120);
    const sets = await setsOf(item.id);
    expect(
      sets.map((set) => [set.weightKg, set.reps, set.completedAt]),
    ).toEqual([
      [60, 10, null],
      [62.5, 8, null],
    ]);
    // 種目 1 件とセット 2 件を、親から順に積む
    expect((await outbox()).slice(1).map((change) => change.entity)).toEqual([
      "workoutExercise",
      "set",
      "set",
    ]);
  });

  it("前回の記録がなければ、空のセットを 1 つ作る", async () => {
    const workout = await startWorkout();
    const item = await addExercise(workout.id, BENCH);
    expect(item.restSeconds).toBe(90);
    const sets = await setsOf(item.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ weightKg: null, reps: null });
  });

  it("追加した順に並ぶ", async () => {
    const workout = await startWorkout();
    const a = await addExercise(workout.id, BENCH);
    const b = await addExercise(workout.id, PUSH_UP);
    expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);
  });
});

describe("種目の並べ替え・削除", () => {
  it("入れ替えた種目の並び順を送る", async () => {
    const workout = await startWorkout();
    const a = await addExercise(workout.id, BENCH);
    const b = await addExercise(workout.id, PUSH_UP);
    await localDb.outbox.clear();

    await moveExercise(b.id, -1);

    expect((await localDb.workoutExercises.get(a.id))?.sortOrder).toBe(1);
    expect((await localDb.workoutExercises.get(b.id))?.sortOrder).toBe(0);
    const changes = await outbox();
    expect(changes.map((change) => change.id).sort()).toEqual(
      [a.id, b.id].sort(),
    );
  });

  it("先頭をさらに上へは動かさない", async () => {
    const workout = await startWorkout();
    const a = await addExercise(workout.id, BENCH);
    await localDb.outbox.clear();
    await moveExercise(a.id, -1);
    expect(await outbox()).toEqual([]);
  });

  it("削除すると端末のセットも消し、送るのは種目の削除だけ", async () => {
    const workout = await startWorkout();
    const item = await addExercise(workout.id, BENCH);
    await addSet(item.id);
    await localDb.outbox.clear();

    await removeExercise(item.id);

    expect(await localDb.workoutExercises.get(item.id)).toBeUndefined();
    expect(await setsOf(item.id)).toEqual([]);
    expect(await outbox()).toEqual([
      expect.objectContaining({
        entity: "workoutExercise",
        op: "delete",
        id: item.id,
      }),
    ]);
  });
});

describe("セット", () => {
  async function benchSet() {
    const workout = await startWorkout();
    const item = await addExercise(workout.id, BENCH);
    const [set] = await setsOf(item.id);
    return { item, set };
  }

  it("セットを追加すると、直前のセットを複製する（未完了）", async () => {
    const { item, set } = await benchSet();
    await updateSet(set.id, { weightKg: 80, reps: 5 });
    await toggleComplete(set.id);

    const added = await addSet(item.id);

    expect(added).toMatchObject({
      weightKg: 80,
      reps: 5,
      sortOrder: 1,
      completedAt: null,
    });
  });

  it("±2.5kg で重量を変え、0〜999.75kg に収める", async () => {
    const { set } = await benchSet();
    await stepWeight(set.id, 2.5);
    expect((await localDb.sets.get(set.id))?.weightKg).toBe(2.5);
    await stepWeight(set.id, -2.5);
    await stepWeight(set.id, -2.5);
    expect((await localDb.sets.get(set.id))?.weightKg).toBe(0);
    await updateSet(set.id, { weightKg: 999 });
    await stepWeight(set.id, 2.5);
    expect((await localDb.sets.get(set.id))?.weightKg).toBe(999.75);
  });

  it("必要な項目が空なら完了にできない", async () => {
    const { set } = await benchSet();
    await updateSet(set.id, { weightKg: 60 });
    expect(await toggleComplete(set.id)).toBe(
      "完了にするには回数を入れてください",
    );
    expect((await localDb.sets.get(set.id))?.completedAt).toBeNull();
  });

  it("完了したセットの必須項目を空にしたら、未完了に戻す", async () => {
    const { set } = await benchSet();
    await updateSet(set.id, { weightKg: 60, reps: 10 });
    expect(await toggleComplete(set.id)).toBeNull();
    expect((await localDb.sets.get(set.id))?.completedAt).not.toBeNull();

    await updateSet(set.id, { reps: null });
    expect((await localDb.sets.get(set.id))?.completedAt).toBeNull();
  });

  it("値が変わらなければ送信待ちに積まない", async () => {
    const { set } = await benchSet();
    await updateSet(set.id, { weightKg: 60 });
    const before = await localDb.outbox.count();
    await updateSet(set.id, { weightKg: 60 });
    expect(await localDb.outbox.count()).toBe(before);
  });

  it("同じセットを続けて変えても、変更時刻は前より後になる", async () => {
    const { set } = await benchSet();
    await updateSet(set.id, { weightKg: 60 });
    await updateSet(set.id, { reps: 10 });
    await updateSet(set.id, { reps: 11 });
    const stamps = (await outbox())
      .filter((change) => change.id === set.id)
      .map((change) => Date.parse(String(change.clientUpdatedAt)));
    expect(stamps).toHaveLength(4);
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i]).toBeGreaterThan(stamps[i - 1]);
    }
  });
});

describe("nextStamp", () => {
  it("端末の時計が戻っても、前の値より後にする", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(Date.parse(nextStamp(future))).toBe(Date.parse(future) + 1);
  });
});
