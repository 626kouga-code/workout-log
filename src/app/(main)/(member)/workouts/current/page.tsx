import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkoutRecorder } from "@/components/workouts/workout-recorder";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "記録中" };

/**
 * 記録画面（S-11）。中身は端末のデータ（IndexedDB）から読むので、サーバーでは枠だけを作る。
 * Service Worker がこの画面の HTML を保存しておき、圏外でも開けるようにする（src/app/sw.ts）。
 */
export default function CurrentWorkoutPage() {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <Recorder />
    </Suspense>
  );
}

async function Recorder() {
  const user = await requireUser();
  return <WorkoutRecorder userId={user.id} />;
}
