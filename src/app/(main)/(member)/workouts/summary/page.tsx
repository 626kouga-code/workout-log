import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkoutSummaryView } from "@/components/workouts/workout-summary";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "ワークアウト完了" };

/**
 * ワークアウト完了画面（S-12）。/workouts/summary?id=… の形で開く。
 * 中身は端末のデータから読む。ID をクエリで渡すので、圏外でも同じ保存済みの画面で開ける。
 */
export default function WorkoutSummaryPage() {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <Summary />
    </Suspense>
  );
}

async function Summary() {
  const user = await requireUser();
  return <WorkoutSummaryView userId={user.id} />;
}
