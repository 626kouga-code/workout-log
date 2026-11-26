"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import { findInProgressWorkout } from "@/client/workouts/actions";
import { OfflineSafeLink } from "@/components/offline-safe-link";
import { RECORD_PAGE } from "@/lib/offline-pages";
import { Elapsed } from "./elapsed";

/**
 * 「記録中（経過時間）」のバー（F-16）。記録中のワークアウトが端末にあれば、
 * どの画面でもタブの上（PC は画面の下）に出し、押すと記録画面に戻る。
 * ブラウザを閉じても端末にデータが残るので、開き直したときもここから続きを再開できる。
 */
export function RecordingBar() {
  const pathname = usePathname();
  const workout = useLiveQuery(findInProgressWorkout, []);
  if (!workout || pathname === RECORD_PAGE) return null;

  return (
    <>
      {/* バーの高さの分だけ、画面の下に余白を空ける */}
      <div aria-hidden="true" className="h-14" />
      <OfflineSafeLink
        href={RECORD_PAGE}
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex min-h-12 items-center justify-between gap-2 bg-blue-600 px-4 text-white md:bottom-0 md:left-56"
      >
        <span className="font-bold">
          記録中 <Elapsed since={workout.startedAt} />
        </span>
        <span className="text-sm">記録に戻る ›</span>
      </OfflineSafeLink>
    </>
  );
}
