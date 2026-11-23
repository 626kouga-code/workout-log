import { expect, test } from "@playwright/test";

test("ヘルスチェックが DB に接続できて 200 を返す", async ({ request }) => {
  const res = await request.get("/api/health");

  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
