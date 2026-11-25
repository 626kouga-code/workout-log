"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { FormError, SubmitButton } from "@/components/form/field";
import { verifyEmailAction } from "@/server/auth/actions";
import type { VerifyResult } from "@/server/auth/email-verification";

/**
 * 確認リンクの着地ページの中身。開いただけでは確認せず、ボタンを押して確定する
 * （メールのセキュリティ機能がリンクを先に開いても、トークンを使い切らないように）。
 */
export function VerifyEmailForm() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyResult>();
  const [error, setError] = useState<string>();

  if (!token || result === "invalid") {
    return (
      <Message title="リンクが正しくありません">
        メールに書かれたリンクを、もう一度そのまま開いてください。
      </Message>
    );
  }
  if (result === "verified") {
    return (
      <Message title="メールアドレスを確認しました">
        投稿やコメントができるようになりました。
        <Link href="/" className="ml-1 text-blue-600 underline">
          ホームへ
        </Link>
      </Message>
    );
  }
  if (result === "used") {
    return (
      <Message title="このリンクはすでに使われています">
        確認はもう済んでいます。
        <Link href="/" className="ml-1 text-blue-600 underline">
          ホームへ
        </Link>
      </Message>
    );
  }
  if (result === "expired") {
    return (
      <Message title="リンクの有効期限が切れています">
        <span className="block">
          確認メールを送り直してください（ログインが必要です）。
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-3">
          <ResendVerificationButton />
          <Link href="/login" className="text-blue-600 underline">
            ログイン
          </Link>
        </span>
      </Message>
    );
  }

  const verify = () =>
    startTransition(async () => {
      const response = await verifyEmailAction(token);
      if (!response.ok) {
        setError(response.error.message);
        return;
      }
      setResult(response.data);
      // 画面上部の「未確認」の帯を消すため、サーバーから表示を取り直す
      if (response.data === "verified") router.refresh();
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        verify();
      }}
      className="flex flex-col gap-4"
    >
      <FormError message={error} />
      <p className="text-sm">下のボタンを押すと、確認が完了します。</p>
      <SubmitButton pending={pending}>
        {pending ? "確認しています…" : "メールアドレスを確認する"}
      </SubmitButton>
    </form>
  );
}

function Message({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section role="status" className="flex flex-col gap-2">
      <h2 className="font-bold">{title}</h2>
      <p className="text-sm">{children}</p>
    </section>
  );
}
