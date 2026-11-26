import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkoutSummaryView } from "@/components/workouts/workout-summary";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "ワークアウト完了" };

/** ワークアウト完了画面（S-12）。中身は端末のデータから読む */
export default function WorkoutSummaryPage({
  params,
}: PageProps<"/workouts/[id]/summary">) {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <Summary params={params} />
    </Suspense>
  );
}

async function Summary({
  params,
}: {
  params: PageProps<"/workouts/[id]/summary">["params"];
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  return <WorkoutSummaryView workoutId={id} userId={user.id} />;
}
