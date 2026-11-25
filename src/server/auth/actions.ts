"use server";

import { redirect } from "next/navigation";
import {
  fromError,
  fromZodError,
  type ActionResult,
} from "@/lib/action-result";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  logInSchema,
  signUpSchema,
  type LogInInput,
  type SignUpInput,
} from "@/lib/validation/auth";
import { logIn, signUp } from "./auth-service";
import { endSession, startSession } from "./session";

/** 新規登録して、そのままログインした状態でホームへ移る（F-01） */
export async function signUpAction(
  input: SignUpInput,
): Promise<ActionResult<never>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const { userId } = await signUp(parsed.data);
    await startSession(userId);
  } catch (error) {
    return fromError(error);
  }
  // redirect() は例外を投げて画面を移すため、try の外で呼ぶ
  redirect("/");
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
