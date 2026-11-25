import type { ReactNode } from "react";

/** フォームの 1 項目（ラベル・入力欄・説明・エラー）。エラーは入力欄と aria で結び付ける */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** 入力欄の見た目（エラーのときは赤枠） */
export function inputClass(hasError: boolean): string {
  return `rounded-lg border px-3 py-2 text-base ${
    hasError ? "border-red-500" : "border-neutral-300"
  }`;
}

/** 入力欄に付ける aria 属性（エラーや説明を読み上げられるように） */
export function describedBy(
  id: string,
  { hint, error }: { hint?: boolean; error?: string },
) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-lg bg-blue-600 px-4 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** フォーム全体のエラー（ログイン失敗など、特定の項目に結び付かないもの） */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  );
}
