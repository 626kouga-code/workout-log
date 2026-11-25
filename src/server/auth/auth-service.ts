import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/id";
import type { LogInData, SignUpData } from "@/lib/validation/auth";
import { db } from "@/server/db";
import { getDummyHash, hashPassword, verifyPassword } from "./password";

const EMAIL_TAKEN = "このメールアドレスはすでに登録されています";
const HANDLE_TAKEN = "このユーザーIDはすでに使われています";
export const LOGIN_FAILED = "メールアドレスまたはパスワードが違います";

/**
 * 新規登録（F-01）。入力は signUpSchema で検証済みのものを受け取る。
 * メールアドレス・ユーザーIDの重複は CONFLICT（項目ごとのエラー付き）にする。
 * 大文字小文字の違いは、DB の照合順序（_ci）により同じものとして扱われる。
 */
export async function signUp(input: SignUpData): Promise<{ userId: string }> {
  const existing = await db.user.findMany({
    where: { OR: [{ email: input.email }, { handle: input.handle }] },
    select: { email: true, handle: true },
  });
  const fieldErrors: Record<string, string[]> = {};
  for (const user of existing) {
    if (user.email.toLowerCase() === input.email) {
      fieldErrors.email = [EMAIL_TAKEN];
    }
    if (user.handle.toLowerCase() === input.handle.toLowerCase()) {
      fieldErrors.handle = [HANDLE_TAKEN];
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError("CONFLICT", undefined, fieldErrors);
  }

  const id = newId();
  try {
    await db.user.create({
      data: {
        id,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        handle: input.handle,
        displayName: input.displayName,
      },
    });
  } catch (error) {
    // 確認してから作るまでの間に、同じものが登録された場合
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // どの一意制約に当たったかは meta に入る（ドライバーアダプターにより形が違うため、文字列にして探す）
      const target = JSON.stringify(error.meta ?? {});
      throw new AppError(
        "CONFLICT",
        undefined,
        target.includes("handle")
          ? { handle: [HANDLE_TAKEN] }
          : { email: [EMAIL_TAKEN] },
      );
    }
    throw error;
  }
  return { userId: id };
}

/**
 * ログイン（F-03）。メールアドレスとパスワードが合えばユーザーの ID を返す。
 * どちらが違っても同じエラーにし、登録されているメールアドレスかを分からないようにする。
 */
export async function logIn(input: LogInData): Promise<{ userId: string }> {
  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true },
  });
  const matched = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await getDummyHash()),
  );
  if (!user || !matched) {
    throw new AppError("UNAUTHORIZED", LOGIN_FAILED);
  }
  return { userId: user.id };
}
