"use server";

import { redirect } from "next/navigation";
import {
  fail,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  logInSchema,
  signUpSchema,
  type LogInInput,
  type SignUpInput,
} from "@/lib/validation/auth";
import { logIn, signUp } from "./auth-service";
import { verifyEmailToken, type VerifyResult } from "./email-verification";
import { endSession, getCurrentUser, startSession } from "./session";
import { logMailFailure, sendVerificationMail } from "./verification-mail";

/** 新規登録して確認メールを送り、そのままログインした状態でホームへ移る（F-01・F-02） */
export async function signUpAction(
  input: SignUpInput,
): Promise<ActionResult<never>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  let userId: string;
  try {
    ({ userId } = await signUp(parsed.data));
    await startSession(userId);
  } catch (error) {
    return fromError(error);
  }
  // 確認メールが送れなくても登録は完了させる（あとで画面上部の帯から再送できる）
  try {
    await sendVerificationMail(userId);
  } catch (error) {
    logMailFailure(userId, error);
  }
  // redirect() は例外を投げて画面を移すため、try の外で呼ぶ
  redirect("/");
}

/** 確認リンクのトークンで、メールアドレスを確認済みにする（F-02、S-45） */
export async function verifyEmailAction(
  token: string,
): Promise<ActionResult<VerifyResult>> {
  // トークンは 43 文字の base64url。それ以外は DB を読むまでもなく無効
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(token)) {
    return ok("invalid");
  }
  try {
    return ok(await verifyEmailToken(token));
  } catch (error) {
    return fromError(error);
  }
}

/** ログイン中のユーザーに確認メールを送り直す（1 分に 1 回まで。F-02） */
export async function resendVerificationEmailAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED");
  if (user.emailVerified) return ok();
  try {
    await sendVerificationMail(user.id);
  } catch (error) {
    if (error instanceof AppError) return fromError(error);
    logMailFailure(user.id, error);
    return fail(
      "INTERNAL_ERROR",
      "メールを送れませんでした。時間をおいてやり直してください",
    );
  }
  return ok();
}

/** ログインして、元の画面（なければホーム）へ移る（F-03） */
export async function logInAction(
  input: LogInInput,
  next?: string | null,
): Promise<ActionResult<never>> {
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const { userId } = await logIn(parsed.data);
    await startSession(userId);
  } catch (error) {
    return fromError(error);
  }
  redirect(safeNextPath(next));
}

/** ログアウトして、ログイン画面へ移る（F-03） */
export async function logOutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
