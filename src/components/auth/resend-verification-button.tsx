"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmailAction } from "@/server/auth/actions";

/** 「確認メールを再送」ボタン。送った結果（またはエラー）をボタンの横に出す */
export function ResendVerificationButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationEmailAction();
      setMessage(
        result.ok
          ? { ok: true, text: "確認メールを送りました" }
          : { ok: false, text: result.error.message },
      );
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="rounded-md border border-current px-2 py-1 text-xs font-bold disabled:opacity-50"
      >
        {pending ? "送信中…" : "確認メールを再送"}
      </button>
      {message && (
        <span role="status" className={message.ok ? "" : "text-red-700"}>
          {message.text}
        </span>
      )}
    </span>
  );
}
