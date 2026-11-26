"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { warmOfflinePages } from "@/client/offline-cache";
import { findInProgressWorkout, startWorkout } from "@/client/workouts/actions";
import { flushOutbox } from "@/client/workouts/outbox";
import { useAutoSync } from "@/client/workouts/use-auto-sync";
import { goTo, OfflineSafeLink } from "@/components/offline-safe-link";
import { RECORD_PAGE } from "@/lib/offline-pages";

const buttonClass =
  "flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 font-bold text-white disabled:opacity-50";

/**
 * 記録トップ（S-10）の「空のワークアウトを開始」。
 * 記録中のワークアウトが端末にあれば、代わりに「記録を再開」を出す。
 */
export function StartWorkout({ userId }: { userId: string }) {
  useAutoSync(userId);
  const router = useRouter();
  // 記録画面を先に保存しておき、圏外になってから開いても表示できるようにする
  useEffect(() => {
    void warmOfflinePages();
  }, []);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 読み込み中は undefined、記録中のものがなければ null
  const inProgress = useLiveQuery(
    async () => (await findInProgressWorkout()) ?? null,
    [],
  );

  if (inProgress) {
    return (
      <OfflineSafeLink href={RECORD_PAGE} className={buttonClass}>
        記録を再開
      </OfflineSafeLink>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        disabled={inProgress === undefined || starting}
        onClick={async () => {
          setStarting(true);
          setError(null);
          try {
            await startWorkout();
            void flushOutbox();
            goTo(router.push, RECORD_PAGE);
          } catch {
            setError("開始できませんでした");
            setStarting(false);
          }
        }}
        className={buttonClass}
      >
        空のワークアウトを開始
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
