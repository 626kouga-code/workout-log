"use client";

import { useEffect, useState } from "react";

/** 開始からの経過時間（"12:34" や "1:02:03"）。1 秒ごとに更新する */
export function Elapsed({ since }: { since: string }) {
  const now = useNow();
  return <span className="tabular-nums">{formatElapsed(since, now)}</span>;
}

export function formatElapsed(since: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
