import { z } from "zod";
import { isDateString } from "@/lib/date";
import { isId } from "@/lib/id";

/**
 * 記録中のデータの同期（F-16、docs/06_api.md「記録中のデータの同期」）で、
 * 端末から送られてくる変更の形。端末（#9）とサーバーで同じものを使う。
 *
 * 変更は「エンティティ（ワークアウト・ワークアウトの種目・セット）ごとの丸ごとの状態」を送る upsert と、
 * 削除の delete の 2 種類。毎回全項目を送るので、新しいほうを採用するだけで済む。
 */

/** 1 回の送信で送れる変更の数。多いときは端末が分けて送る */
export const MAX_CHANGES_PER_SYNC = 200;

export const WEIGHT_MAX_KG = 999.75;
export const REPS_MAX = 999;
export const DURATION_MAX_SECONDS = 24 * 60 * 60;
export const DISTANCE_MAX_M = 999_999;
export const NOTE_MAX_LENGTH = 500;
export const REST_MAX_SECONDS = 3600;
export const SORT_ORDER_MAX = 999;

const idSchema = z.string().refine(isId, "ID の形式が正しくありません");
/** 日時（ISO 8601。例 2026-11-25T10:00:00.000Z） */
const dateTimeSchema = z.iso
  .datetime({ offset: true, error: "日時の形式が正しくありません" })
  .transform((value) => new Date(value));
const sortOrderSchema = z.int().min(0).max(SORT_ORDER_MAX);

export const workoutDataSchema = z
  .object({
    /** 実施日（日本時間の日付 "YYYY-MM-DD"） */
    performedOn: z
      .string()
      .refine(isDateString, "日付の形式が正しくありません"),
    startedAt: dateTimeSchema,
    /** null なら記録中 */
    finishedAt: dateTimeSchema.nullable(),
    note: z
      .string()
      .max(NOTE_MAX_LENGTH, `メモは ${NOTE_MAX_LENGTH} 文字以内です`),
  })
  .refine(
    (data) => data.finishedAt === null || data.finishedAt >= data.startedAt,
    { error: "終了時刻は開始時刻より後にしてください", path: ["finishedAt"] },
  );

export const workoutExerciseDataSchema = z.object({
  workoutId: idSchema,
  exerciseId: idSchema,
  sortOrder: sortOrderSchema,
  restSeconds: z.int().min(0).max(REST_MAX_SECONDS),
});

export const setDataSchema = z.object({
  workoutExerciseId: idSchema,
  sortOrder: sortOrderSchema,
  weightKg: z
    .number()
    .min(0, "重量は 0kg 以上です")
    .max(WEIGHT_MAX_KG, `重量は ${WEIGHT_MAX_KG}kg までです`)
    .refine((value) => Number.isInteger(value * 4), "重量は 0.25kg 刻みです")
    .nullable(),
  reps: z
    .int()
    .min(1, "回数は 1 回以上です")
    .max(REPS_MAX, `回数は ${REPS_MAX} 回までです`)
    .nullable(),
  durationSeconds: z
    .int()
    .min(1, "時間は 1 秒以上です")
    .max(DURATION_MAX_SECONDS, "時間は 24 時間までです")
    .nullable(),
  distanceM: z
    .int()
    .min(0, "距離は 0m 以上です")
    .max(DISTANCE_MAX_M, "距離が大きすぎます")
    .nullable(),
  /** 「完了」にした日時。null なら未完了 */
  completedAt: dateTimeSchema.nullable(),
});

const changeBase = {
  /** 変更ごとに端末で作る ID。同じ変更が二重に届いても 1 回だけ反映するために使う */
  changeId: idSchema,
  /** 変更するエンティティの ID（端末で作った UUIDv7） */
  id: idSchema,
  /** 端末で変更した時刻 */
  clientUpdatedAt: dateTimeSchema,
};

export const changeSchema = z.union([
  z.object({
    ...changeBase,
    entity: z.literal("workout"),
    op: z.literal("upsert"),
    data: workoutDataSchema,
  }),
  z.object({
    ...changeBase,
    entity: z.literal("workoutExercise"),
    op: z.literal("upsert"),
    data: workoutExerciseDataSchema,
  }),
  z.object({
    ...changeBase,
    entity: z.literal("set"),
    op: z.literal("upsert"),
    data: setDataSchema,
  }),
  z.object({
    ...changeBase,
    entity: z.enum(["workout", "workoutExercise", "set"]),
    op: z.literal("delete"),
  }),
]);

export type ChangeInput = z.input<typeof changeSchema>;
export type Change = z.output<typeof changeSchema>;
export type SyncEntity = Change["entity"];
export type WorkoutData = z.output<typeof workoutDataSchema>;
export type WorkoutExerciseData = z.output<typeof workoutExerciseDataSchema>;
export type SetData = z.output<typeof setDataSchema>;

/**
 * 送信全体の形。個々の変更の中身はここでは確かめず、changeId だけを確かめる。
 * 1 件の不正な変更のために全体を断ると、端末の送信待ちが詰まってしまうため、
 * 中身はサーバーで 1 件ずつ確かめ、不正なものだけを rejected にする。
 */
export const syncRequestSchema = z.object({
  changes: z
    .array(z.looseObject({ changeId: idSchema }))
    .max(
      MAX_CHANGES_PER_SYNC,
      `1 回に送れる変更は ${MAX_CHANGES_PER_SYNC} 件までです`,
    ),
});

/** 変更ごとの結果。端末はどの結果でも、その変更を送信待ちから消してよい */
export type ChangeStatus =
  /** 反映した */
  | "applied"
  /** 前に反映済みの変更（二重送信） */
  | "duplicate"
  /** 反映しなかった（ほかの端末の新しい変更がある・削除済み） */
  | "ignored"
  /** 受け付けられない（不正な値・他人のデータ・存在しない親） */
  | "rejected";

export type SyncResponse = {
  results: { changeId: string; status: ChangeStatus; reason?: string }[];
  /** 記録中は 1 件までのため、自動で終了にしたワークアウトの ID（画面で知らせる） */
  autoFinished: string[];
  /** 更新した自己ベスト（判定は #16 で作る。それまでは空） */
  personalRecords: unknown[];
};
