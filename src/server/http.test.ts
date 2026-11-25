import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { errorResponse, errorResponseFrom, isSameOrigin } from "./http";

describe("isSameOrigin", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/workouts/sync", {
      method: "POST",
      headers,
    });

  it("Origin とリクエスト先のホストが同じなら受け付ける", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://localhost:3000", host: "localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("プロキシの後ろでは x-forwarded-host と比べる", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://app.example.com",
          host: "10.0.0.5:3000",
          "x-forwarded-host": "app.example.com",
        }),
      ),
    ).toBe(true);
  });

  it.each([
    [
      "別のサイト",
      { origin: "https://evil.example.com", host: "localhost:3000" },
    ],
    ["ポート違い", { origin: "http://localhost:4000", host: "localhost:3000" }],
    ["Origin なし", { host: "localhost:3000" }],
    ["Origin が壊れている", { origin: "not a url", host: "localhost:3000" }],
  ])("%s は受け付けない", (_, headers) => {
    expect(isSameOrigin(request(headers))).toBe(false);
  });
});

describe("errorResponse", () => {
  it.each([
    ["VALIDATION_ERROR", 400],
    ["UNAUTHORIZED", 401],
    ["EMAIL_NOT_VERIFIED", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["PAYLOAD_TOO_LARGE", 413],
  ] as const)("%s は %i", async (code, status) => {
    const res = errorResponse(code);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });
});

describe("errorResponseFrom", () => {
  it("AppError はそのステータスとメッセージ", async () => {
    const res = errorResponseFrom(
      new AppError("NOT_FOUND", "投稿が見つかりません"),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "投稿が見つかりません" },
    });
  });

  it("想定外のエラーは 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(errorResponseFrom(new Error("boom")).status).toBe(500);
  });
});
