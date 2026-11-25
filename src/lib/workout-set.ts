import { EXERCISE_KIND_LABELS, type ExerciseKind } from "@/lib/exercise";

/** セットの入力項目 */
export type SetFields = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
};

type Rule = {
  /** この種別で使う項目（それ以外は空でなければならない） */
  allowed: (keyof SetFields)[];
  /** 「完了」にするときに必須の項目 */
  requiredWhenCompleted: (keyof SetFields)[];
};

/**
 * 種別ごとに、セットのどの項目を使うか（F-12、docs/05 の列挙値の対応表）。
 * - 重量：重量と回数
 * - 自重：回数（＋任意で加重 kg）
 * - 時間：秒数（＋任意で加重 kg）
 * - 有酸素：時間と、任意で距離
 */
export const SET_RULES: Record<ExerciseKind, Rule> = {
  WEIGHT: {
    allowed: ["weightKg", "reps"],
    requiredWhenCompleted: ["weightKg", "reps"],
  },
  BODYWEIGHT: {
    allowed: ["weightKg", "reps"],
    requiredWhenCompleted: ["reps"],
  },
  TIMED: {
    allowed: ["weightKg", "durationSeconds"],
    requiredWhenCompleted: ["durationSeconds"],
  },
  CARDIO: {
    allowed: ["durationSeconds", "distanceM"],
    requiredWhenCompleted: ["durationSeconds"],
  },
};

const FIELD_LABELS: Record<keyof SetFields, string> = {
  weightKg: "重量",
  reps: "回数",
  durationSeconds: "時間",
  distanceM: "距離",
};

/**
 * セットの項目が種別に合っているかを確かめる。合っていれば null、違えば理由を返す。
 * 必須の項目は「完了」にしたときだけ求める（記録中は、値を入れる前の空のセットを先に作るため）。
 */
export function checkSetForKind(
  kind: ExerciseKind,
  set: SetFields,
  completed: boolean,
): string | null {
  const rule = SET_RULES[kind];
  for (const field of Object.keys(FIELD_LABELS) as (keyof SetFields)[]) {
    if (set[field] !== null && !rule.allowed.includes(field)) {
      return `${EXERCISE_KIND_LABELS[kind]}の種目に${FIELD_LABELS[field]}は入れられません`;
    }
  }
  if (completed) {
    for (const field of rule.requiredWhenCompleted) {
      if (set[field] === null) {
        return `完了にするには${FIELD_LABELS[field]}を入れてください`;
      }
    }
  }
  return null;
}
