"use client";

import { useState, useTransition } from "react";
import { clearLocalData } from "@/client/workouts/local-db";
import { countOutbox, flushOutbox } from "@/client/workouts/outbox";
import { logOutAction } from "@/server/auth/actions";

/**
 * ログアウト（F-03）。端末には記録のデータを置いているので、ログアウト前に片付ける（docs/06）。
 * 1. 送信待ちがあれば送る
 * 2. それでも残っていれば、失われることを伝えて確かめる
 * 3. 端末のデータを消してからログアウトする
 * ログアウトにはサーバーとの通信が要るので、圏外では押せないことを伝える。
 */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const [unsent, setUnsent] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const logOut = () =>
    startTransition(async () => {
      await clearLocalData();
      await logOutAction();
    });

  const onClick = () =>
    startTransition(async () => {
      setMessage(null);
      if (!navigator.onLine) {
        setMessage(
          "圏外ではログアウトできません。通信できる場所で操作してください",
        );
        return;
      }
      if ((await countOutbox()) > 0) {
        await flushOutbox();
        const left = await countOutbox();
        if (left > 0) {
          setUnsent(left);
          return;
        }
      }
      await clearLocalData();
      await logOutAction();
    });

  if (unsent > 0) {
    return (
      <div
        role="group"
        aria-label="ログアウトの確認"
        className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 text-sm"
      >
        <p>
          未送信の記録が {unsent}{" "}
          件あります。今ログアウトすると、この記録は失われます。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={logOut}
            className="min-h-11 rounded-lg bg-red-600 px-4 text-white disabled:opacity-50"
          >
            それでもログアウト
          </button>
          <button
            type="button"
            onClick={() => setUnsent(0)}
            className="min-h-11 rounded-lg px-4 hover:bg-neutral-100"
          >
            やめる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        ログアウト
      </button>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
