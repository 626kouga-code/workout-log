import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { errorResponse, errorResponseFrom } from "./http";

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
