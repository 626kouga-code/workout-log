import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/server/auth/session";
import { listExercises } from "@/server/exercises/exercise-service";
import { ExerciseManager } from "./exercise-manager";

export const metadata: Metadata = { title: "種目の管理" };

/** 種目の管理（S-14、F-11） */
export default function ExercisesPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/workouts" className="text-sm text-blue-600 underline">
          ← 記録へ
        </Link>
        <h1 className="mt-2 text-xl font-bold">種目の管理</h1>
      </div>
      {/* ログイン中のユーザーの種目を読むため、Suspense で囲む */}
      <Suspense
        fallback={<p className="text-sm text-neutral-500">読み込み中…</p>}
      >
        <ExerciseList />
      </Suspense>
    </main>
  );
}

async function ExerciseList() {
  const user = await requireUser();
  const exercises = await listExercises(user.id, { includeHidden: true });
  return <ExerciseManager exercises={exercises} />;
}
