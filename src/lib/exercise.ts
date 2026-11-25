/**
 * 種目の部位・種別（docs/05_data-model.md「列挙値の対応表」）。
 * DB には英語の値をそのまま文字列で保存し、画面では日本語の表示名に変える。
 * 並び順は、画面での表示順。
 */

export const BODY_PARTS = [
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "ABS",
  "FULL_BODY",
  "CARDIO",
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  CHEST: "胸",
  BACK: "背中",
  LEGS: "脚",
  SHOULDERS: "肩",
  ARMS: "腕",
  ABS: "腹",
  FULL_BODY: "全身",
  CARDIO: "有酸素",
};

export const EXERCISE_KINDS = [
  "WEIGHT",
  "BODYWEIGHT",
  "TIMED",
  "CARDIO",
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  WEIGHT: "重量",
  BODYWEIGHT: "自重",
  TIMED: "時間",
  CARDIO: "有酸素",
};

/** 種目選択や一覧で使う、種目の情報 */
export type ExerciseItem = {
  id: string;
  name: string;
  bodyPart: BodyPart;
  kind: ExerciseKind;
  /** プリセット（全員が使える種目）なら true。自分で追加した種目なら false */
  isPreset: boolean;
  hidden: boolean;
};

/** 部位の表示順で並べるための比較関数（同じ部位の中は元の順のまま） */
export function compareByBodyPart(a: ExerciseItem, b: ExerciseItem): number {
  return BODY_PARTS.indexOf(a.bodyPart) - BODY_PARTS.indexOf(b.bodyPart);
}
