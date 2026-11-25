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

/**
 * 同じサイトの画面から送られたリクエストか（docs/03 の CSRF 対策）。
 * 更新を受け付ける Route Handlers の先頭で確かめる。
 * ブラウザが付ける Origin（送信元のサイト）が、リクエスト先のホストと同じときだけ受け付ける。
 * Server Actions で Next.js が行う確認と同じ考え方で、プロキシの後ろでは x-forwarded-host を使う。
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** 投げられたエラーを応答に変える。AppError 以外は想定外として 500 にする */
export function errorResponseFrom(error: unknown): Response {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message);
  }
  console.error(error);
  return errorResponse("INTERNAL_ERROR");
}
