import type { PrismaClient } from "@/generated/prisma/client";
import { PRESET_EXERCISES } from "./presets";

/**
 * プリセット種目を DB に入れる。ID で upsert するので、何度流しても同じ結果になる。
 * 名前・部位・種別を直したときは、流し直せば反映される。
 * prisma/seed.ts（`npx prisma db seed`）と、結合テストから呼ぶ。
 */
export async function seedPresetExercises(db: PrismaClient): Promise<void> {
  for (const { id, name, bodyPart, kind } of PRESET_EXERCISES) {
    await db.exercise.upsert({
      where: { id },
      create: { id, userId: null, name, bodyPart, kind },
      update: { name, bodyPart, kind },
    });
  }
}
