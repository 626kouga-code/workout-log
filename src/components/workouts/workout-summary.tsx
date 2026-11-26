"use client";

import Link from "next/link";
import { summarizeWorkout } from "@/client/workouts/summary";
import { useAutoSync } from "@/client/workouts/use-auto-sync";
import { useWorkout } from "@/client/workouts/use-workout";
import { toJstTime } from "@/lib/date";

/** ワークアウト完了画面（S-12）の基本：総ボリューム・時間など */
export function WorkoutSummaryView({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}) {
  useAutoSync(userId);
  const view = useWorkout(workoutId);

  if (view === undefined) {
    return <p className="px-4 py-6 text-sm text-neutral-500">読み込み中…</p>;
  }
  if (view === null) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-start gap-2 px-4 py-6 text-sm">
        この端末にはこのワークアウトの記録がありません。
        <Link href="/workouts" className="text-blue-600 underline">
          記録トップへ
        </Link>
      </main>
    );
  }

  const { workout } = view;
  const summary = summarizeWorkout(
    workout,
    view.exercises.length,
    view.exercises.flatMap((exercise) => exercise.sets),
  );
  const items = [
    {
      label: "総ボリューム",
      value: `${summary.volumeKg.toLocaleString("ja-JP")} kg`,
    },
    {
      label: "時間",
      value:
        summary.durationMinutes === null
          ? "記録中"
          : `${summary.durationMinutes} 分`,
    },
    { label: "種目", value: `${summary.exerciseCount} 種目` },
    { label: "完了したセット", value: `${summary.completedSetCount} セット` },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">おつかれさまでした</h1>
      <p className="text-sm text-neutral-500">
        {workout.performedOn}　{toJstTime(new Date(workout.startedAt))}
        {workout.finishedAt && ` 〜 ${toJstTime(new Date(workout.finishedAt))}`}
      </p>
      <dl className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3"
          >
            <dt className="text-xs text-neutral-500">{item.label}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {workout.finishedAt === null ? (
        <Link
          href={`/workouts/${workout.id}`}
          className="flex min-h-11 items-center justify-center rounded-lg bg-blue-600 font-bold text-white"
        >
          記録に戻る
        </Link>
      ) : (
        <Link
          href="/workouts"
          className="flex min-h-11 items-center justify-center rounded-lg bg-blue-600 font-bold text-white"
        >
          記録トップへ
        </Link>
      )}
    </main>
  );
}
