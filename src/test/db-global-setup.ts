import { execSync } from "node:child_process";

/**
 * 結合テストの開始前に 1 回だけ、テスト用のデータベースへマイグレーションを当てる。
 * ローカルでは workout_log_test（docker/mysql/init で作成）、CI ではサービスコンテナの DB。
 */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error("DATABASE_URL_TEST が設定されていません（.env を確認）");
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
