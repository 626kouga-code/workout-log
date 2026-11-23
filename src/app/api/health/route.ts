import { connection } from "next/server";
import { db } from "@/server/db";

/**
 * ヘルスチェック。DB に接続できるかも確かめる（docs/12_aws-architecture.md）。
 * ECS のヘルスチェックから呼ばれる。
 */
export async function GET() {
  // ビルド時に結果を固定（プリレンダー）せず、リクエストのたびに実行する
  await connection();

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ status: "error" }, { status: 503 });
  }
}
