"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { localDb } from "@/client/workouts/local-db";
import { useOnline } from "@/client/use-online";

/** 通信できるときは、送り終えるまでの少しの間は出さない（操作のたびに表示がちらつかないように） */
const ONLINE_DELAY_MS = 2000;

/**
 * 「未送信 n 件」（F-16）。送信待ちが残っているときだけ出す。
 * 圏外のときは、通信が戻れば自動で送ることも伝える。
 */
export function SyncStatus() {
  const count = useLiveQuery(() => localDb.outbox.count(), [], 0);
  const online = useOnline();
  // 件数が変わってから一定時間たったときの件数（変わった直後は一致しないので出さない）
  const [settledCount, setSettledCount] = useState<number | null>(null);

  useEffect(() => {
    if (count === 0) return;
    const timer = setTimeout(() => setSettledCount(count), ONLINE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [count]);

  const visible = count > 0 && (!online || settledCount === count);
  return (
    <div role="status" className={visible ? "" : "sr-only"}>
      {visible && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          未送信 {count} 件
          {!online && "。圏外です。通信が戻ったら自動で送ります"}
        </p>
      )}
    </div>
  );
}
