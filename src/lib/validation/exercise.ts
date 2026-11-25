import { z } from "zod";
import { BODY_PARTS, EXERCISE_KINDS } from "@/lib/exercise";

export const EXERCISE_NAME_MAX_LENGTH = 30;

/** 自分の種目の追加・編集の入力（F-11）。画面とサーバーで同じものを使う */
export const exerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "種目名を入力してください")
    .max(
      EXERCISE_NAME_MAX_LENGTH,
      `種目名は ${EXERCISE_NAME_MAX_LENGTH} 文字以内で入力してください`,
    ),
  bodyPart: z.enum(BODY_PARTS, { error: "部位を選んでください" }),
  kind: z.enum(EXERCISE_KINDS, { error: "種別を選んでください" }),
});

export type ExerciseInput = z.input<typeof exerciseSchema>;
export type ExerciseData = z.output<typeof exerciseSchema>;
