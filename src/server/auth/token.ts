import { createHash, randomBytes } from "node:crypto";

/**
 * Cookie やリンクに入れる秘密のトークン。32 バイトの乱数を URL で使える文字（base64url）にする。
 * DB にはトークンそのものではなく hashToken() の結果だけを保存する（DB が漏れてもなりすませないように）。
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** トークンの SHA-256（16 進数 64 文字） */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
