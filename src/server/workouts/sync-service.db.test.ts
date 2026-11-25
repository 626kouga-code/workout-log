import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/id";
import type { ChangeInput } from "@/lib/validation/workout-sync";
import { db } from "@/server/db";
import {
  createExercise,
  deleteExercise,
  updateExercise,
} from "@/server/exercises/exercise-service";
import { PRESET_EXERCISES } from "@/server/exercises/presets";
import { getPreviousRecords } from "./offline-data";
import { applyChanges } from "./sync-service";

const BENCH = PRESET_EXERCISES.find((e) => e.name === "ベンチプレス")!.id;
const RUNNING = PRESET_EXERCISES.find((e) => e.name === "ランニング")!.id;

/** 2026-11-25 10:00（UTC）から n 分後 */
const at = (minutes: number) =>
  new Date(Date.UTC(2026, 10, 25, 10, minutes)).toISOString();

// ---- 変更を作る小さな関数（端末が送るものと同じ形） ----

function workout(
  id: string,
  clientAt: number,
  data: Partial<{
    performedOn: string;
    startedAt: string;
    finishedAt: string | null;
    note: string;
  }> = {},
): ChangeInput {
  return {
    changeId: newId(),
    entity: "workout",
    op: "upsert",
    id,
    clientUpdatedAt: at(clientAt),
    data: {
      performedOn: "2026-11-25",
      startedAt: at(0),
      finishedAt: null,
      note: "",
      ...data,
    },
  };
}

function workoutExercise(
  id: string,
  workoutId: string,
  clientAt: number,
  exerciseId = BENCH,
): ChangeInput {
  return {
    changeId: newId(),
    entity: "workoutExercise",
    op: "upsert",
    id,
    clientUpdatedAt: at(clientAt),
    data: { workoutId, exerciseId, sortOrder: 0, restSeconds: 90 },
  };
}

function set(
  id: string,
  workoutExerciseId: string,
  clientAt: number,
  data: Partial<{
    sortOrder: number;
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
    completedAt: string | null;
  }> = {},
): ChangeInput {
  return {
    changeId: newId(),
    entity: "set",
    op: "upsert",
    id,
    clientUpdatedAt: at(clientAt),
    data: {
      workoutExerciseId,
      sortOrder: 0,
      weightKg: 80,
      reps: 8,
      durationSeconds: null,
      distanceM: null,
      completedAt: null,
      ...data,
    },
  };
}

function remove(
  entity: "workout" | "workoutExercise" | "set",
  id: string,
  clientAt: number,
): ChangeInput {
  return {
    changeId: newId(),
    entity,
    op: "delete",
    id,
    clientUpdatedAt: at(clientAt),
  };
}

const statuses = (response: Awaited<ReturnType<typeof applyChanges>>) =>
  response.results.map((r) => r.status);

async function createUser(handle: string): Promise<string> {
  const id = newId();
  await db.user.create({
    data: {
      id,
      email: `${handle}@example.com`,
      passwordHash: "x",
      handle,
      displayName: handle,
    },
  });
  return id;
}

let me: string;
let other: string;

beforeEach(async () => {
  me = await createUser("me");
  other = await createUser("other");
});

/** 記録中のワークアウト 1 件・ベンチプレス・セット 1 つを作っておく */
async function startWorkout(userId = me) {
  const ids = { workout: newId(), we: newId(), set: newId() };
  const response = await applyChanges(userId, [
    workout(ids.workout, 0),
    workoutExercise(ids.we, ids.workout, 1),
    set(ids.set, ids.we, 2),
  ]);
  expect(statuses(response)).toEqual(["applied", "applied", "applied"]);
  return ids;
}

describe("記録の一連の流れ", () => {
  it("開始 → 種目追加 → セット入力・完了 → 終了が反映される", async () => {
    const ids = await startWorkout();
    const response = await applyChanges(me, [
      set(ids.set, ids.we, 3, { weightKg: 82.5, reps: 6, completedAt: at(3) }),
      workout(ids.workout, 4, { finishedAt: at(4), note: "胸の日" }),
    ]);
    expect(statuses(response)).toEqual(["applied", "applied"]);

    const saved = await db.workout.findUniqueOrThrow({
      where: { id: ids.workout },
      include: { exercises: { include: { sets: true } } },
    });
    expect(saved).toMatchObject({
      userId: me,
      note: "胸の日",
      finishedAt: new Date(at(4)),
    });
    expect(saved.performedOn.toISOString().slice(0, 10)).toBe("2026-11-25");
    const [savedSet] = saved.exercises[0].sets;
    expect(Number(savedSet.weightKg)).toBe(82.5);
    expect(savedSet).toMatchObject({ reps: 6, completedAt: new Date(at(3)) });
  });
});

describe("二重送信", () => {
  it("同じ変更を 2 回送っても、2 回目は duplicate で 1 回分しか反映しない", async () => {
    const ids = { workout: newId(), we: newId(), set: newId() };
    const changes = [
      workout(ids.workout, 0),
      workoutExercise(ids.we, ids.workout, 1),
      set(ids.set, ids.we, 2),
    ];
    await applyChanges(me, changes);
    // 応答が届かず、端末が同じ変更を送り直した
    const again = await applyChanges(me, changes);

    expect(statuses(again)).toEqual(["duplicate", "duplicate", "duplicate"]);
    expect(await db.workout.count()).toBe(1);
    expect(await db.workoutSet.count()).toBe(1);
  });
});

describe("複数の端末の競合", () => {
  it.each([
    ["新しい変更が先に届く", ["new", "old"]],
    ["古い変更が先に届く", ["old", "new"]],
  ] as const)(
    "%s場合も、端末で変更した時刻が新しいほうが残る",
    async (_, order) => {
      const ids = await startWorkout();
      const changes = {
        new: set(ids.set, ids.we, 20, { reps: 10 }), // 端末 A：10:20 に 10 回に変更
        old: set(ids.set, ids.we, 10, { reps: 5 }), // 端末 B：10:10 に 5 回に変更（圏外で遅れて届く）
      };
      const results = [];
      for (const key of order) {
        results.push(statuses(await applyChanges(me, [changes[key]]))[0]);
      }

      expect(results).toEqual(
        order[0] === "new" ? ["applied", "ignored"] : ["applied", "applied"],
      );
      const saved = await db.workoutSet.findUniqueOrThrow({
        where: { id: ids.set },
      });
      expect(saved.reps).toBe(10);
    },
  );

  it("ほかの端末で消したセットに、遅れて更新が届いても復活しない", async () => {
    const ids = await startWorkout();
    await applyChanges(me, [remove("set", ids.set, 10)]);
    // 消した時刻より後の更新でも、削除済みなら無視する
    const response = await applyChanges(me, [
      set(ids.set, ids.we, 20, { reps: 12 }),
    ]);

    expect(statuses(response)).toEqual(["ignored"]);
    expect(await db.workoutSet.count()).toBe(0);
  });

  it("ワークアウトを消すと、その中の種目・セットへの遅れた変更も無視する", async () => {
    const ids = await startWorkout();
    await applyChanges(me, [remove("workout", ids.workout, 10)]);

    const response = await applyChanges(me, [
      set(ids.set, ids.we, 20, { reps: 12 }), // 消したセットの更新
      set(newId(), ids.we, 21), // 消した種目へのセット追加
      workoutExercise(newId(), ids.workout, 22), // 消したワークアウトへの種目追加
    ]);

    expect(statuses(response)).toEqual(["ignored", "ignored", "ignored"]);
    expect(await db.workout.count()).toBe(0);
    expect(await db.workoutExercise.count()).toBe(0);
    expect(await db.workoutSet.count()).toBe(0);
  });

  it("ほかの端末で新しく変更されたものへの古い削除は無視する", async () => {
    const ids = await startWorkout();
    await applyChanges(me, [set(ids.set, ids.we, 20, { reps: 10 })]);
    const response = await applyChanges(me, [remove("set", ids.set, 10)]);

    expect(statuses(response)).toEqual(["ignored"]);
    expect(await db.workoutSet.count()).toBe(1);
  });
});

describe("記録中は 1 件まで", () => {
  it("別の端末で新しく開始すると、古いほうを終了にして知らせる", async () => {
    const first = newId();
    await applyChanges(me, [workout(first, 0, { startedAt: at(0) })]);

    const second = newId();
    const response = await applyChanges(me, [
      workout(second, 30, { startedAt: at(30) }),
    ]);

    expect(response.autoFinished).toEqual([first]);
    const [old, current] = await Promise.all([
      db.workout.findUniqueOrThrow({ where: { id: first } }),
      db.workout.findUniqueOrThrow({ where: { id: second } }),
    ]);
    expect(old.finishedAt).toEqual(new Date(at(30)));
    expect(current.finishedAt).toBeNull();
  });

  it("古いほうの開始が遅れて届いた場合は、届いたほうを終了にする", async () => {
    const newer = newId();
    await applyChanges(me, [workout(newer, 30, { startedAt: at(30) })]);
    const older = newId();
    const response = await applyChanges(me, [
      workout(older, 0, { startedAt: at(0) }),
    ]);

    expect(response.autoFinished).toEqual([older]);
    expect(
      (await db.workout.findUniqueOrThrow({ where: { id: newer } })).finishedAt,
    ).toBeNull();
  });

  it("他人の記録中のワークアウトには影響しない", async () => {
    const others = await startWorkout(other);
    await startWorkout(me);
    expect(
      (await db.workout.findUniqueOrThrow({ where: { id: others.workout } }))
        .finishedAt,
    ).toBeNull();
  });
});

describe("他人のデータには触れない", () => {
  it.each([
    [
      "他人のワークアウトの ID で上書き",
      (o: Ids) => [workout(o.workout, 50, { note: "乗っ取り" })],
    ],
    [
      "他人のワークアウトを削除",
      (o: Ids) => [remove("workout", o.workout, 50)],
    ],
    [
      "他人のセットを書き換え",
      (o: Ids) => [set(o.set, o.we, 50, { reps: 99 })],
    ],
    ["他人のセットを削除", (o: Ids) => [remove("set", o.set, 50)]],
    [
      "他人のワークアウトに種目を追加",
      (o: Ids) => [workoutExercise(newId(), o.workout, 50)],
    ],
    [
      "他人のワークアウトの種目にセットを追加",
      (o: Ids) => [set(newId(), o.we, 50)],
    ],
  ])("%s → rejected で、他人のデータは変わらない", async (_, build) => {
    const others = await startWorkout(other);
    const before = await snapshot();

    const response = await applyChanges(me, build(others));

    expect(statuses(response)).toEqual(["rejected"]);
    expect(response.results[0].reason).toBe("見つかりません");
    expect(await snapshot()).toEqual(before);
  });

  it("他人の種目は使えない", async () => {
    const othersExercise = await createExercise(other, {
      name: "他人の種目",
      bodyPart: "CHEST",
      kind: "WEIGHT",
    });
    const ids = await startWorkout();
    const response = await applyChanges(me, [
      workoutExercise(newId(), ids.workout, 10, othersExercise.id),
    ]);
    expect(statuses(response)).toEqual(["rejected"]);
    expect(response.results[0].reason).toBe("種目が見つかりません");
  });
});

type Ids = Awaited<ReturnType<typeof startWorkout>>;

/** 比べるための、全ワークアウト・種目・セットの中身 */
async function snapshot() {
  return {
    workouts: await db.workout.findMany({ orderBy: { id: "asc" } }),
    exercises: await db.workoutExercise.findMany({ orderBy: { id: "asc" } }),
    sets: await db.workoutSet.findMany({ orderBy: { id: "asc" } }),
  };
}

describe("受け付けられない変更", () => {
  it("1 件が不正でも、ほかの変更は反映する", async () => {
    const ids = await startWorkout();
    const response = await applyChanges(me, [
      set(newId(), ids.we, 10, { reps: 0 }), // 回数 0 は不可
      set(newId(), ids.we, 11, { durationSeconds: 60 }), // 重量種目に時間は入れられない
      { changeId: newId(), entity: "???" } as unknown as ChangeInput, // 形が違う
      set(newId(), newId(), 12), // 親の種目がない
      set(newId(), ids.we, 13, { reps: 5 }), // これは正しい
    ]);

    expect(statuses(response)).toEqual([
      "rejected",
      "rejected",
      "rejected",
      "rejected",
      "applied",
    ]);
    expect(response.results[1].reason).toBe("重量の種目に時間は入れられません");
    expect(response.results[3].reason).toBe(
      "ワークアウトの種目が見つかりません",
    );
  });

  it("有酸素の種目には時間・距離を記録できる", async () => {
    const ids = await startWorkout();
    const run = newId();
    const response = await applyChanges(me, [
      workoutExercise(run, ids.workout, 10, RUNNING),
      set(newId(), run, 11, {
        weightKg: null,
        reps: null,
        durationSeconds: 1800,
        completedAt: at(11),
      }),
    ]);
    expect(statuses(response)).toEqual(["applied", "applied"]);
  });
});

describe("古い記録の掃除", () => {
  it("7 日より古い「反映済みの変更」「削除の記録」は、同期のついでに消す", async () => {
    const ids = await startWorkout();
    await applyChanges(me, [remove("set", ids.set, 3)]);
    expect(await db.appliedChange.count({ where: { userId: me } })).toBe(4);
    expect(await db.deletedRecord.count({ where: { userId: me } })).toBe(1);

    const eightDaysLater = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await applyChanges(me, [], eightDaysLater);

    expect(await db.appliedChange.count({ where: { userId: me } })).toBe(0);
    expect(await db.deletedRecord.count({ where: { userId: me } })).toBe(0);
  });
});

describe("前回の記録（offline-data）", () => {
  it("種目ごとに、終了済みで最も新しいワークアウトのセットを返す（記録中は除く）", async () => {
    // 11/20 と 11/22 に終了したワークアウト、今日は記録中
    for (const [day, reps] of [
      [20, 5],
      [22, 8],
    ] as const) {
      const w = newId();
      const we = newId();
      await applyChanges(me, [
        workout(w, 0, {
          performedOn: `2026-11-${day}`,
          startedAt: `2026-11-${day}T10:00:00.000Z`,
          finishedAt: `2026-11-${day}T11:00:00.000Z`,
        }),
        workoutExercise(we, w, 0),
        set(newId(), we, 0, { sortOrder: 0, reps }),
        set(newId(), we, 0, { sortOrder: 1, reps: reps - 1 }),
      ]);
    }
    await startWorkout();

    const records = await getPreviousRecords(me);
    expect(records).toEqual([
      {
        exerciseId: BENCH,
        performedOn: "2026-11-22",
        restSeconds: 90,
        sets: [
          { weightKg: 80, reps: 8, durationSeconds: null, distanceM: null },
          { weightKg: 80, reps: 7, durationSeconds: null, distanceM: null },
        ],
      },
    ]);
    // 他人には見えない
    expect(await getPreviousRecords(other)).toEqual([]);
  });
});

describe("#7 から引き継いだ種目の制限", () => {
  const squat = {
    name: "フロントスクワット",
    bodyPart: "LEGS",
    kind: "WEIGHT",
  } as const;

  async function useOwnExercise() {
    const mine = await createExercise(me, squat);
    const ids = await startWorkout();
    await applyChanges(me, [
      workoutExercise(newId(), ids.workout, 10, mine.id),
    ]);
    return mine;
  }

  async function catchAppError(promise: Promise<unknown>) {
    const error = await promise.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }

  it("記録で使った種目は種別を変えられない（名前・部位は変えられる）", async () => {
    const mine = await useOwnExercise();
    const error = await catchAppError(
      updateExercise(me, mine.id, { ...squat, kind: "BODYWEIGHT" }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(error.fieldErrors?.kind?.[0]).toContain("種別を変えられません");

    await expect(
      updateExercise(me, mine.id, {
        ...squat,
        name: "ハイバースクワット",
        bodyPart: "FULL_BODY",
      }),
    ).resolves.toMatchObject({ name: "ハイバースクワット" });
  });

  it("記録で使った種目は削除できない", async () => {
    const mine = await useOwnExercise();
    const error = await catchAppError(deleteExercise(me, mine.id));
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toContain("非表示にしてください");
  });

  it("自分の種目を使った記録があると、ユーザーはそのままでは削除できず、ワークアウトを先に消せば削除できる（退会 #28 の前提）", async () => {
    await useOwnExercise();
    // 種目への外部キーが「削除を拒否」なので、連鎖削除の途中で止まる
    await expect(db.user.delete({ where: { id: me } })).rejects.toThrow();

    await db.$transaction([
      db.workout.deleteMany({ where: { userId: me } }),
      db.user.delete({ where: { id: me } }),
    ]);
    expect(await db.workout.count({ where: { userId: me } })).toBe(0);
    expect(await db.exercise.count({ where: { userId: me } })).toBe(0);
  });
});
