import "dotenv/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const DB_TESTS = "src/**/*.db.test.ts";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        // 単体テスト・画面のテスト（DB を使わない）
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [DB_TESTS],
        },
      },
      {
        // 結合テスト（本物の MySQL を使う。docs/08_testing.md）
        extends: true,
        resolve: {
          alias: {
            // server-only は React Server Components の外で読むとエラーになるため、空のモジュールに差し替える
            "server-only": fileURLToPath(
              new URL("./src/test/empty.ts", import.meta.url),
            ),
          },
        },
        test: {
          name: "db",
          environment: "node",
          include: [DB_TESTS],
          // テスト用のデータベースを使う
          env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
          globalSetup: ["./src/test/db-global-setup.ts"],
          setupFiles: ["./src/test/db-setup.ts"],
          // 同じデータベースを使うため、ファイルを並列に流さない
          fileParallelism: false,
          // bcrypt（コスト 12）が 1 回 0.2〜0.3 秒かかるため、長めにする
          testTimeout: 20_000,
        },
      },
    ],
  },
});
