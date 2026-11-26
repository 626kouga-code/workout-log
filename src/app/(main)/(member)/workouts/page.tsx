import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StartWorkout } from "@/components/workouts/start-workout";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "記録" };

/** 記録トップ（S-10）。カレンダーと履歴は #11 で作る */
export default function WorkoutsPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">記録</h1>
      <Suspense>
        <StartWorkoutLoader />
      </Suspense>
      <p className="text-sm text-neutral-500">
        履歴・カレンダーは準備中です（#11）。
      </p>
      <Link href="/exercises" className="text-sm text-blue-600 underline">
        種目の管理
      </Link>
    </main>
  );
}

async function StartWorkoutLoader() {
  const user = await requireUser();
  return <StartWorkout userId={user.id} />;
}
