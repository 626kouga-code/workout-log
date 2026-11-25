import { afterAll, beforeAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { PRESET_EXERCISES } from "@/server/exercises/presets";

let tables: string[] = [];

beforeAll(async () => {
  // マイグレーションの履歴以外の、すべてのテーブル
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
  tables = rows.map((row) => row.name);
});

/**
 * テストごとにデータを消し、互いに影響しないようにする（docs/08_testing.md）。
 * TRUNCATE は MySQL では 1 テーブルごとに時間がかかるため、行の少ないテストでは速い DELETE を使う。
 * そのあと、本番と同じくプリセット種目だけは入った状態にする。
 */
beforeEach(async () => {
  await db.$transaction([
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0"),
    ...tables.map((table) => db.$executeRawUnsafe(`DELETE FROM \`${table}\``)),
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"),
  ]);
  await db.exercise.createMany({
    data: PRESET_EXERCISES.map((preset) => ({ ...preset, userId: null })),
  });
});

afterAll(async () => {
  await db.$disconnect();
});
