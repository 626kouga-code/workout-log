import "server-only";
import bcrypt from "bcryptjs";

/** bcrypt のコスト（docs/03_non-functional-requirements.md） */
const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * 存在しないメールアドレスでログインされたときに、比べる相手にするハッシュ。
 * ユーザーがいてもいなくても同じだけ時間をかけ、応答の速さから登録の有無を推測されないようにする。
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("dummy-password-for-timing", COST);
  return dummyHash;
}
