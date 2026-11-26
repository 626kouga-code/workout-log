import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkoutRecorder } from "@/components/workouts/workout-recorder";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "記録中" };

/**
 * 記録画面（S-11）。中身は端末のデータ（IndexedDB）から読むので、サーバーでは枠だけを作る。
 */
export default function WorkoutPage({ params }: PageProps<"/workouts/[id]">) {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <Recorder params={params} />
    </Suspense>
  );
}

async function Recorder({
  params,
}: {
  params: PageProps<"/workouts/[id]">["params"];
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  return <WorkoutRecorder workoutId={id} userId={user.id} />;
}
