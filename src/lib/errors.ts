/**
 * アプリ全体で使うエラーコード（docs/06_api.md「共通の方針」）。
 * Server Actions では { ok: false, error: { code } }、Route Handlers では HTTP ステータスとして返す。
 */
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400, // 入力が不正
  UNAUTHORIZED: 401, // ログインしていない
  EMAIL_NOT_VERIFIED: 403, // メールアドレスが未確認（SNS の操作。F-02）
  FORBIDDEN: 403, // 権限がない
  NOT_FOUND: 404, // 存在しない（他人のデータも、存在を知らせないよう 404 にする）
  CONFLICT: 409, // 重複など（ユーザーID が使われている など）
  PAYLOAD_TOO_LARGE: 413, // 画像が大きすぎる
  TOO_MANY_REQUESTS: 429, // 回数の制限（確認メールの再送 など）
  INTERNAL_ERROR: 500, // 想定外のエラー
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** 画面にそのまま出せる既定のメッセージ */
export const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "入力内容を確認してください",
  UNAUTHORIZED: "ログインしてください",
  EMAIL_NOT_VERIFIED: "メールアドレスの確認が必要です",
  FORBIDDEN: "この操作はできません",
  NOT_FOUND: "見つかりませんでした",
  CONFLICT: "すでに登録されています",
  PAYLOAD_TOO_LARGE: "ファイルが大きすぎます",
  TOO_MANY_REQUESTS: "しばらく待ってからやり直してください",
  INTERNAL_ERROR: "エラーが発生しました。時間をおいてやり直してください",
};

/**
 * 想定内のエラー（入力不正・権限なし・見つからない など）。
 * サービス関数（src/server/）はこれを投げ、呼び出し側で ActionResult や HTTP の応答に変える。
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string = DEFAULT_MESSAGES[code],
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}
