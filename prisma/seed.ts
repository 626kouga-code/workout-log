// 初期データの投入（`npx prisma db seed`）。今はプリセット種目だけ（F-10）。
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { toPoolConfig } from "../src/server/db-config";
import { seedPresetExercises } from "../src/server/exercises/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません（.env を確認）");

  const db = new PrismaClient({
    adapter: new PrismaMariaDb(toPoolConfig(url)),
  });
  try {
    await seedPresetExercises(db);
    const count = await db.exercise.count({ where: { userId: null } });
    console.log(`プリセット種目を入れました（${count} 件）`);
  } finally {
    await db.$disconnect();
  }
}

// package.json が ES モジュール指定ではないため、トップレベルの await を使わずに関数で動かす
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
