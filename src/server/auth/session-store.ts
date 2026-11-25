import "server-only";
import { newId } from "@/lib/id";
import { db } from "@/server/db";
import { generateToken, hashToken } from "./token";

/** ログイン状態を保つ期間（F-03：30 日） */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** 画面やサーバー処理に渡す、ログイン中のユーザーの情報（必要なものだけ） */
export type SessionUser = {
  id: string;
  handle: string;
  displayName: string;
  emailVerified: boolean;
};

/** セッションを DB に作り、Cookie に入れるトークンを返す */
export async function createSessionRecord(
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.session.create({
    data: { id: newId(), tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

/** トークンからログイン中のユーザーを探す。見つからない・期限切れなら null */
export async function findSessionUser(
  token: string,
  now: Date = new Date(),
): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          emailVerifiedAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt <= now) return null;
  const { user } = session;
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

/** セッションを削除する（ログアウト）。もう無いトークンでもエラーにしない */
export async function deleteSessionRecord(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
