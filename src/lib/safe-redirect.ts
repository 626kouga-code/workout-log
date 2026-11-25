/**
 * ログイン後の戻り先（`/login?next=...`）として使ってよいパスかを確かめる。
 * 外部のサイトへ飛ばされないよう、自サイト内のパス（`/` で始まり、`//` や `/\` で始まらない）だけを受け付ける。
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // 制御文字（改行など）を含むものは受け付けない
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
