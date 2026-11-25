"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { applyActionError } from "@/components/form/apply-action-error";
import {
  describedBy,
  Field,
  FormError,
  inputClass,
  SubmitButton,
} from "@/components/form/field";
import {
  signUpSchema,
  type SignUpData,
  type SignUpInput,
} from "@/lib/validation/auth";
import { signUpAction } from "@/server/auth/actions";

const FIELDS = [
  "email",
  "password",
  "handle",
  "displayName",
  "agreeToTerms",
] as const;

export function SignUpForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      handle: "",
      displayName: "",
      agreeToTerms: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    // 成功したときはサーバー側でホームへ移るため、戻り値があるのは失敗したときだけ
    const result = await signUpAction(values);
    if (result && !result.ok) applyActionError(result.error, setError, FIELDS);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={errors.root?.message} />

      <Field id="email" label="メールアドレス" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass(!!errors.email)}
          {...describedBy("email", { error: errors.email?.message })}
          {...register("email")}
        />
      </Field>

      <Field
        id="password"
        label="パスワード"
        hint="8 文字以上"
        error={errors.password?.message}
      >
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClass(!!errors.password)}
          {...describedBy("password", {
            hint: true,
            error: errors.password?.message,
          })}
          {...register("password")}
        />
      </Field>

      <Field
        id="handle"
        label="ユーザーID"
        hint="半角英数字と _ で 3〜15 文字。プロフィールの URL になります"
        error={errors.handle?.message}
      >
        <div className="flex items-center gap-1">
          <span className="text-neutral-500">@</span>
          <input
            id="handle"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={`${inputClass(!!errors.handle)} flex-1`}
            {...describedBy("handle", {
              hint: true,
              error: errors.handle?.message,
            })}
            {...register("handle")}
          />
        </div>
      </Field>

      <Field
        id="displayName"
        label="表示名"
        hint="50 文字以内"
        error={errors.displayName?.message}
      >
        <input
          id="displayName"
          autoComplete="nickname"
          className={inputClass(!!errors.displayName)}
          {...describedBy("displayName", {
            hint: true,
            error: errors.displayName?.message,
          })}
          {...register("displayName")}
        />
      </Field>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            {...describedBy("agreeToTerms", {
              error: errors.agreeToTerms?.message,
            })}
            {...register("agreeToTerms")}
          />
          <span>
            <Link
              href="/terms"
              target="_blank"
              className="text-blue-600 underline"
            >
              利用規約
            </Link>
            と
            <Link
              href="/privacy"
              target="_blank"
              className="text-blue-600 underline"
            >
              プライバシーポリシー
            </Link>
            に同意する
          </span>
        </label>
        {errors.agreeToTerms?.message && (
          <p
            id="agreeToTerms-error"
            role="alert"
            className="text-xs text-red-600"
          >
            {errors.agreeToTerms.message}
          </p>
        )}
      </div>

      <SubmitButton pending={isSubmitting}>
        {isSubmitting ? "登録しています…" : "登録する"}
      </SubmitButton>
    </form>
  );
}
