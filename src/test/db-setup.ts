import { afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";

/** マイグレーションの履歴以外の、すべてのテーブル */
async function listTables(): Promise<string[]> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
  return rows.map((row) => row.name);
}

// テストごとにデータを消し、互いに影響しないようにする（docs/08_testing.md）
beforeEach(async () => {
  const tables = await listTables();
  await db.$transaction([
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0"),
    ...tables.map((table) =>
      db.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``),
    ),
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"),
  ]);
});

afterAll(async () => {
  await db.$disconnect();
});
