import type { z } from "zod";
import { AppError, DEFAULT_MESSAGES, type ErrorCode } from "./errors";

/**
 * Server Actions の戻り値（docs/06_api.md「共通の方針」）。
 * 想定内のエラーは例外にせず、この形で画面に返す。
 */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: ActionError };

export type ActionError = {
  code: ErrorCode;
  message: string;
  /** フォームの項目ごとのエラー（例：{ handle: ["3〜15 文字で入力してください"] }） */
  fieldErrors?: Record<string, string[]>;
};

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string = DEFAULT_MESSAGES[code],
  fieldErrors?: Record<string, string[]>,
): { ok: false; error: ActionError } {
  return {
    ok: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  };
}

/** Zod の検証エラーを、項目ごとのエラーに変える */
export function fromZodError(error: z.ZodError): {
  ok: false;
  error: ActionError;
} {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(
    "VALIDATION_ERROR",
    DEFAULT_MESSAGES.VALIDATION_ERROR,
    fieldErrors,
  );
}

/** 投げられたエラーを ActionResult に変える。AppError 以外は想定外として扱う */
export function fromError(error: unknown): { ok: false; error: ActionError } {
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.fieldErrors);
  }
  console.error(error);
  return fail("INTERNAL_ERROR");
}
