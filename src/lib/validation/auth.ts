import { z } from "zod";

/**
 * 新規登録・ログインの入力スキーマ（F-01・F-03）。
 * 画面のフォーム（React Hook Form）とサーバー（Server Actions）で同じものを使う。
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt は先頭 72 バイトまでしか見ないため、それより長いパスワードは受け付けない */
export const PASSWORD_MAX_BYTES = 72;
export const HANDLE_PATTERN = /^[A-Za-z0-9_]{3,15}$/;
export const DISPLAY_NAME_MAX_LENGTH = 50;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** メールアドレス。前後の空白を除き、小文字にそろえる */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "メールアドレスを入力してください")
  .max(254, "メールアドレスが長すぎます")
  .regex(z.regexes.email, "メールアドレスの形式が正しくありません");

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `パスワードは ${PASSWORD_MIN_LENGTH} 文字以上で入力してください`,
    )
    .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, {
      error: `パスワードは半角 ${PASSWORD_MAX_BYTES} 文字以内で入力してください`,
    }),
  handle: z
    .string()
    .trim()
    .regex(
      HANDLE_PATTERN,
      "ユーザーIDは半角英数字と _ で 3〜15 文字にしてください",
    ),
  displayName: z
    .string()
    .trim()
    .min(1, "表示名を入力してください")
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `表示名は ${DISPLAY_NAME_MAX_LENGTH} 文字以内で入力してください`,
    ),
  agreeToTerms: z.boolean().refine((value) => value, {
    error: "利用規約とプライバシーポリシーへの同意が必要です",
  }),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpData = z.output<typeof signUpSchema>;

export const logInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LogInInput = z.input<typeof logInSchema>;
export type LogInData = z.output<typeof logInSchema>;
