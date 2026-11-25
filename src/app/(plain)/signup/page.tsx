import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "新規登録" };

/** 新規登録（S-04、F-01） */
export default function SignUpPage() {
  return (
    <main className="mt-8 flex flex-col gap-6">
      <h1 className="text-xl font-bold">新規登録</h1>
      <SignUpForm />
      <p className="text-sm">
        アカウントをお持ちの方は
        <Link href="/login" className="text-blue-600 underline">
          ログイン
        </Link>
      </p>
    </main>
  );
}
