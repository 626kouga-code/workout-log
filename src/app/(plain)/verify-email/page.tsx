import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = { title: "メールアドレスの確認" };

/** 確認リンクの着地ページ（S-45、F-02） */
export default function VerifyEmailPage() {
  return (
    <main className="mt-8 flex flex-col gap-6">
      <h1 className="text-xl font-bold">メールアドレスの確認</h1>
      {/* トークン（?token=）を URL から読むため、Suspense で囲む */}
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
