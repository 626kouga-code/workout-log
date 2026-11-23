import {
  AppError,
  DEFAULT_MESSAGES,
  ERROR_STATUS,
  type ErrorCode,
} from "@/lib/errors";

/** Route Handlers のエラー応答（docs/06_api.md）：HTTP ステータスと { error: { code, message } } */
export function errorResponse(
  code: ErrorCode,
  message: string = DEFAULT_MESSAGES[code],
): Response {
  return Response.json(
    { error: { code, message } },
    { status: ERROR_STATUS[code] },
  );
}

/** 投げられたエラーを応答に変える。AppError 以外は想定外として 500 にする */
export function errorResponseFrom(error: unknown): Response {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message);
  }
  console.error(error);
  return errorResponse("INTERNAL_ERROR");
}
