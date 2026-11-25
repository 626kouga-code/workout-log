"use server";

import { refresh } from "next/cache";
import {
  fail,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import type { ExerciseItem } from "@/lib/exercise";
import { isId } from "@/lib/id";
import { exerciseSchema, type ExerciseInput } from "@/lib/validation/exercise";
import { requireUser } from "@/server/auth/session";
import {
  createExercise,
  deleteExercise,
  hideExercise,
  unhideExercise,
  updateExercise,
} from "./exercise-service";

/**
 * 種目の追加・編集・非表示・削除（F-11）。
 * どれもログイン中のユーザー本人の種目だけを扱い（サービス関数の中で確かめる）、
 * 成功したら画面のデータを取り直す（refresh）。
 */

export async function createExerciseAction(
  input: ExerciseInput,
): Promise<ActionResult<ExerciseItem>> {
  const user = await requireUser();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const exercise = await createExercise(user.id, parsed.data);
    refresh();
    return ok(exercise);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateExerciseAction(
  exerciseId: string,
  input: ExerciseInput,
): Promise<ActionResult<ExerciseItem>> {
  const user = await requireUser();
  if (!isId(exerciseId)) return fail("NOT_FOUND");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const exercise = await updateExercise(user.id, exerciseId, parsed.data);
    refresh();
    return ok(exercise);
  } catch (error) {
    return fromError(error);
  }
}

/** ID だけを受け取る操作（非表示・再表示・削除）の共通の流れ */
async function runOnExercise(
  exerciseId: string,
  operation: (userId: string, exerciseId: string) => Promise<void>,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isId(exerciseId)) return fail("NOT_FOUND");
  try {
    await operation(user.id, exerciseId);
    refresh();
    return ok();
  } catch (error) {
    return fromError(error);
  }
}

export async function hideExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  return runOnExercise(exerciseId, (userId, id) => hideExercise(userId, id));
}

export async function unhideExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  return runOnExercise(exerciseId, unhideExercise);
}

export async function deleteExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  return runOnExercise(exerciseId, deleteExercise);
}
