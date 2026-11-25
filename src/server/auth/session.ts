import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookie-name";
import {
  createSessionRecord,
  deleteSessionRecord,
  findSessionUser,
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
} from "./session-store";

/**
 * Secure 属性（HTTPS のときだけ送る）を付けるか。本番では付ける。
 * E2E は本番ビルドを http://localhost で動かすため、SESSION_COOKIE_SECURE=false で外せるようにしている。
 */
function isSecureCookie(): boolean {
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** ログインさせる：セッションを作り、Cookie に入れる（Server Actions から呼ぶ） */
export async function startSession(userId: string): Promise<void> {
  const { token } = await createSessionRecord(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** ログアウトさせる：DB のセッションと Cookie を消す（Server Actions から呼ぶ） */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionRecord(token);
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * ログイン中のユーザー。ログインしていなければ null。
 * Cookie を読むので、Server Components では <Suspense> の内側で呼ぶ（cacheComponents のため）。
 * 1 回のリクエストの中では、何度呼んでも DB を読むのは 1 回だけ。
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // 期限切れの判定に現在時刻を使うため、先読み（prefetch）ではなくリクエストのたびに確かめる
  // （cacheComponents では、connection() の前に現在時刻を読むとエラーになる）
  await connection();
  return findSessionUser(token);
});

/** ログイン中のユーザー。ログインしていなければログイン画面へ移る */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type { SessionUser };
