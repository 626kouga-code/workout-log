"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
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
  logInSchema,
  type LogInData,
  type LogInInput,
} from "@/lib/validation/auth";
import { logInAction } from "@/server/auth/actions";

const FIELDS = ["email", "password"] as const;

export function LogInForm() {
  // ログインが必要な画面から来たときは、ログイン後にその画面へ戻す（検査はサーバー側で行う）
  const next = useSearchParams().get("next");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LogInInput, unknown, LogInData>({
    resolver: zodResolver(logInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await logInAction(values, next);
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

      <Field id="password" label="パスワード" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass(!!errors.password)}
          {...describedBy("password", { error: errors.password?.message })}
          {...register("password")}
        />
      </Field>

      <SubmitButton pending={isSubmitting}>
        {isSubmitting ? "ログインしています…" : "ログイン"}
      </SubmitButton>
    </form>
  );
}
