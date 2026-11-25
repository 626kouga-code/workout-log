import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogInForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

/** ログイン（S-03、F-03） */
export default function LogInPage() {
  return (
    <main className="mt-8 flex flex-col gap-6">
      <h1 className="text-xl font-bold">ログイン</h1>
      {/* 戻り先（?next=）を URL から読むため、Suspense で囲む */}
      <Suspense>
        <LogInForm />
      </Suspense>
      <p className="text-sm">
        アカウントをお持ちでない方は
        <Link href="/signup" className="text-blue-600 underline">
          新規登録
        </Link>
      </p>
    </main>
  );
}
