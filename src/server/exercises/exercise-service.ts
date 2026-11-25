import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import {
  compareByBodyPart,
  type BodyPart,
  type ExerciseItem,
  type ExerciseKind,
} from "@/lib/exercise";
import { newId } from "@/lib/id";
import type { ExerciseData } from "@/lib/validation/exercise";
import { db } from "@/server/db";

const NAME_TAKEN = "同じ名前の種目があります";
const NAME_TAKEN_HIDDEN =
  "非表示にした種目に同じ名前があります。非表示の種目から再表示できます";
const KIND_LOCKED =
  "記録で使っている種目は種別を変えられません。別の種目として追加してください";
const IN_USE =
  "記録やメニューで使っているため削除できません。代わりに非表示にしてください";

type ExerciseRow = {
  id: string;
  userId: string | null;
  name: string;
  bodyPart: string;
  kind: string;
  hiddenAt: Date | null;
};

function toItem(row: ExerciseRow): ExerciseItem {
  return {
    id: row.id,
    name: row.name,
    bodyPart: row.bodyPart as BodyPart,
    kind: row.kind as ExerciseKind,
    isPreset: row.userId === null,
    hidden: row.hiddenAt !== null,
  };
}

/**
 * 使える種目の一覧：プリセット＋自分の種目（他人の種目は出さない）。
 * 部位の表示順 → ID 順（＝プリセットは付録の順、自分の種目は追加した順）に並べる。
 * 非表示の種目は includeHidden のときだけ含める（種目の管理画面で使う）。
 */
export async function listExercises(
  userId: string,
  { includeHidden = false }: { includeHidden?: boolean } = {},
): Promise<ExerciseItem[]> {
  const rows = await db.exercise.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...(includeHidden ? {} : { hiddenAt: null }),
    },
    orderBy: { id: "asc" },
  });
  return rows.map(toItem).sort(compareByBodyPart);
}

/** 自分の種目を追加する（F-11） */
export async function createExercise(
  userId: string,
  input: ExerciseData,
): Promise<ExerciseItem> {
  await assertNameAvailable(userId, input.name);
  try {
    const row = await db.exercise.create({
      data: { id: newId(), userId, ...input },
    });
    return toItem(row);
  } catch (error) {
    throw toNameConflict(error);
  }
}

/**
 * 自分の種目を編集する。プリセット・他人の種目は NOT_FOUND。
 * 記録で使っている種目は種別を変えられない（過去のセットの意味が変わってしまうため）。
 */
export async function updateExercise(
  userId: string,
  exerciseId: string,
  input: ExerciseData,
): Promise<ExerciseItem> {
  const current = await findOwnExercise(userId, exerciseId);
  if (current.kind !== input.kind) {
    const used = await db.workoutExercise.count({ where: { exerciseId } });
    if (used > 0) {
      throw new AppError("CONFLICT", undefined, { kind: [KIND_LOCKED] });
    }
  }
  await assertNameAvailable(userId, input.name, exerciseId);
  try {
    const row = await db.exercise.update({
      where: { id: exerciseId },
      data: input,
    });
    return toItem(row);
  } catch (error) {
    throw toNameConflict(error);
  }
}

/** 自分の種目を非表示にする（種目選択に出なくなる。過去の記録はそのまま） */
export async function hideExercise(
  userId: string,
  exerciseId: string,
  now: Date = new Date(),
): Promise<void> {
  await findOwnExercise(userId, exerciseId);
  await db.exercise.update({
    where: { id: exerciseId },
    data: { hiddenAt: now },
  });
}

/** 非表示にした自分の種目を、また表示する */
export async function unhideExercise(
  userId: string,
  exerciseId: string,
): Promise<void> {
  await findOwnExercise(userId, exerciseId);
  await db.exercise.update({
    where: { id: exerciseId },
    data: { hiddenAt: null },
  });
}

/**
 * 自分の種目を削除する。記録・メニューで使っている種目は削除できない（F-11）。
 * 記録・メニューのテーブル（#8・#13）は、種目への外部キーを「削除を拒否」にするので、
 * その違反（P2003）を CONFLICT に変える。
 */
export async function deleteExercise(
  userId: string,
  exerciseId: string,
): Promise<void> {
  await findOwnExercise(userId, exerciseId);
  try {
    await db.exercise.delete({ where: { id: exerciseId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new AppError("CONFLICT", IN_USE);
    }
    throw error;
  }
}

/** 自分の種目を探す。見つからない・プリセット・他人の種目は、存在を知らせないよう NOT_FOUND */
async function findOwnExercise(userId: string, exerciseId: string) {
  const row = await db.exercise.findFirst({
    where: { id: exerciseId, userId },
    select: { id: true, kind: true },
  });
  if (!row) throw new AppError("NOT_FOUND", "種目が見つかりませんでした");
  return row;
}

/**
 * 同じ名前の種目がないかを確かめる。自分の種目に加え、プリセットとも重ならないようにする
 * （種目選択で同じ名前が 2 つ並ぶと見分けられないため）。
 * 大文字小文字の違いは、DB の照合順序（_ci）により同じ名前として扱われる。
 */
async function assertNameAvailable(
  userId: string,
  name: string,
  exceptId?: string,
): Promise<void> {
  const same = await db.exercise.findFirst({
    where: {
      name,
      OR: [{ userId: null }, { userId }],
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { hiddenAt: true },
  });
  if (same) {
    throw new AppError("CONFLICT", undefined, {
      name: [same.hiddenAt ? NAME_TAKEN_HIDDEN : NAME_TAKEN],
    });
  }
}

/** 確認してから保存するまでの間に、同じ名前が登録された場合 */
function toNameConflict(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new AppError("CONFLICT", undefined, { name: [NAME_TAKEN] });
  }
  return error;
}
