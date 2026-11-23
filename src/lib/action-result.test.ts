import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fail, fromError, fromZodError, ok } from "./action-result";
import { AppError } from "./errors";

describe("ok / fail", () => {
  it("成功", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
  });

  it("失敗は既定のメッセージを使う", () => {
    expect(fail("NOT_FOUND")).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "見つかりませんでした" },
    });
  });
});

describe("fromZodError", () => {
  it("項目ごとのエラーにまとめる", () => {
    const schema = z.object({
      handle: z.string().min(3, "3 文字以上で入力してください"),
      profile: z.object({ bio: z.string().max(3, "長すぎます") }),
    });
    const result = schema.safeParse({ handle: "ab", profile: { bio: "abcd" } });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(fromZodError(result.error)).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "入力内容を確認してください",
        fieldErrors: {
          handle: ["3 文字以上で入力してください"],
          "profile.bio": ["長すぎます"],
        },
      },
    });
  });

  it("項目に属さないエラーは _form に入れる", () => {
    const schema = z
      .object({ a: z.string(), b: z.string() })
      .refine((v) => v.a === v.b, "一致しません");
    const result = schema.safeParse({ a: "x", b: "y" });
    if (result.success) throw new Error("検証に失敗するはず");

    expect(fromZodError(result.error).error.fieldErrors).toEqual({
      _form: ["一致しません"],
    });
  });
});

describe("fromError", () => {
  it("AppError はそのコードとメッセージで返す", () => {
    expect(
      fromError(new AppError("CONFLICT", "このユーザーIDは使われています")),
    ).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "このユーザーIDは使われています" },
    });
  });

  it("想定外のエラーは中身を見せずに INTERNAL_ERROR", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(fromError(new Error("DB password is ...")).error).toEqual({
      code: "INTERNAL_ERROR",
      message: "エラーが発生しました。時間をおいてやり直してください",
    });
  });
});
