import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { toPoolConfig } from "./db-config";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL が設定されていません（.env を確認）");
  }
  return new PrismaClient({ adapter: new PrismaMariaDb(toPoolConfig(url)) });
}

// 開発中はファイルを保存するたびにモジュールが読み直されるため、
// 接続が増え続けないよう、作った PrismaClient を globalThis に置いて使い回す。
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
