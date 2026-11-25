import "server-only";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/id";
import { db } from "@/server/db";
import { generateToken, hashToken } from "./token";

/** 確認リンクの有効期限（F-02：24 時間） */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** 確認メールを続けて送れない間隔（F-02：1 分に 1 回まで） */
export const RESEND_INTERVAL_MS = 60 * 1000;

export type VerifyResult = "verified" | "expired" | "used" | "invalid";

/**
 * 確認リンクのトークンを発行し、DB にはハッシュだけを保存する。
 * 直前の発行から 1 分たっていなければ TOO_MANY_REQUESTS。
 * 前に発行したリンクも、期限内なら使える。
 */
export async function issueVerificationToken(
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const latest = await db.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (
    latest &&
    now.getTime() - latest.createdAt.getTime() < RESEND_INTERVAL_MS
  ) {
    throw new AppError(
      "TOO_MANY_REQUESTS",
      "確認メールは 1 分に 1 回まで送れます。しばらく待ってからやり直してください",
    );
  }

  const token = generateToken();
  await db.emailVerification.create({
    data: {
      id: newId(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
      createdAt: now,
    },
  });
  return token;
}

/**
 * 確認リンクのトークンを確かめ、有効ならメールアドレスを確認済みにする。
 * 同じリンクは 1 回だけ使える（同時に 2 回押されても、確認済みにするのは 1 回）。
 */
export async function verifyEmailToken(
  token: string,
  now: Date = new Date(),
): Promise<VerifyResult> {
  const record = await db.emailVerification.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record) return "invalid";
  if (record.usedAt) return "used";
  if (record.expiresAt <= now) return "expired";

  return db.$transaction(async (tx) => {
    // 未使用のときだけ使用済みにする。0 件なら、ほかのリクエストが先に使った
    const { count } = await tx.emailVerification.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (count === 0) return "used";
    await tx.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    return "verified";
  });
}

/**
 * メールアドレスが確認済みかを確かめる。未確認なら EMAIL_NOT_VERIFIED（403）。
 * SNS の操作（投稿・コメント・いいね・フォロー）のサービス関数の先頭で呼ぶ（docs/06_api.md）。
 */
export function assertEmailVerified(user: { emailVerified: boolean }): void {
  if (!user.emailVerified) {
    throw new AppError("EMAIL_NOT_VERIFIED");
  }
}
