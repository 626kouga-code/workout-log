"use client";

import { useEffect } from "react";
import { ensureOwner } from "./local-db";
import { refreshOfflineData } from "./offline-data";
import { flushOutbox } from "./outbox";

/**
 * 端末のデータを使う画面で呼ぶ（docs/06_api.md「記録中のデータの同期」）。
 * 1. 端末のデータがログイン中のユーザーのものか確かめる
 * 2. 送信待ちを送る（画面を開いたとき・通信が戻ったとき・画面に戻ってきたとき）
 * 3. 種目と前回の記録を取り直す（送ったあとに取るので、終えたばかりの記録も前回の記録になる）
 * 操作した直後の送信は、操作した側で flushOutbox() を呼ぶ。
 */
export function useAutoSync(userId: string): void {
  useEffect(() => {
    let ready = false;
    let cancelled = false;
    const sync = () => {
      if (ready) void flushOutbox();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    void (async () => {
      await ensureOwner(userId);
      if (cancelled) return;
      ready = true;
      await flushOutbox();
      if (!cancelled) await refreshOfflineData();
    })();
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);
}
