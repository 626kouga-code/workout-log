"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  addExercise,
  addSet,
  finishWorkout,
  moveExercise,
  removeExercise,
  removeSet,
  stepWeight,
  toggleComplete,
  updateNote,
  updateSet,
} from "@/client/workouts/actions";
import { localDb } from "@/client/workouts/local-db";
import { refreshOfflineData } from "@/client/workouts/offline-data";
import { flushOutbox } from "@/client/workouts/outbox";
import { useAutoSync } from "@/client/workouts/use-auto-sync";
import { useWorkout } from "@/client/workouts/use-workout";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { toJstTime } from "@/lib/date";
import { NOTE_MAX_LENGTH } from "@/lib/validation/workout-sync";
import { ExerciseCard, type ExerciseCardHandlers } from "./exercise-card";

/**
 * 記録画面（S-11）。端末のデータ（IndexedDB）を読んで表示し、操作は端末に保存してから送る。
 */
export function WorkoutRecorder({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}) {
  useAutoSync(userId);
  const router = useRouter();
  const view = useWorkout(workoutId);
  const exercises = useLiveQuery(() => localDb.exercises.toArray(), [], []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 端末に保存してから、送信待ちを送る */
  function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    return action().then(
      (result) => {
        void flushOutbox();
        return result;
      },
      (cause: unknown) => {
        setError(
          cause instanceof Error ? cause.message : "保存できませんでした",
        );
        return undefined;
      },
    );
  }

  const handlers: ExerciseCardHandlers = {
    onChange: (setId, fields) => void run(() => updateSet(setId, fields)),
    onStepWeight: (setId, delta) => void run(() => stepWeight(setId, delta)),
    onToggleComplete: async (setId) =>
      (await run(() => toggleComplete(setId))) ?? null,
    onRemove: (setId) => void run(() => removeSet(setId)),
    onMove: (id, direction) => void run(() => moveExercise(id, direction)),
    onRemoveExercise: (id) => void run(() => removeExercise(id)),
    onAddSet: (id) => void run(() => addSet(id)),
  };

  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      await finishWorkout(workoutId);
    } catch {
      setError("終了できませんでした");
      setFinishing(false);
      return;
    }
    // 送り終えてから前回の記録を取り直す（次のワークアウトの初期値になる）
    void flushOutbox().then(() => refreshOfflineData());
    router.push(`/workouts/${workoutId}/summary`);
  }

  if (view === undefined) {
    return <p className="px-4 py-6 text-sm text-neutral-500">読み込み中…</p>;
  }
  if (view === null) {
    return (
      <Message>
        この端末にはこのワークアウトの記録がありません。
        <Link href="/workouts" className="text-blue-600 underline">
          記録トップへ
        </Link>
      </Message>
    );
  }
  const { workout } = view;
  if (workout.finishedAt !== null && !finishing) {
    return (
      <Message>
        このワークアウトは終了しています。
        <Link
          href={`/workouts/${workout.id}/summary`}
          className="text-blue-600 underline"
        >
          結果を見る
        </Link>
      </Message>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pt-4 pb-40">
      <header className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-bold">記録中</h1>
        <p className="text-sm text-neutral-500">
          {toJstTime(new Date(workout.startedAt))} 開始・経過{" "}
          <Elapsed since={workout.startedAt} />
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {view.exercises.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-neutral-500">
          「種目を追加」から記録する種目を選んでください。
        </p>
      )}
      {view.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.item.id}
          view={exercise}
          isFirst={index === 0}
          isLast={index === view.exercises.length - 1}
          handlers={handlers}
        />
      ))}

      <label className="flex flex-col gap-1 px-1 text-sm">
        <span className="font-bold">メモ</span>
        <textarea
          key={workout.note}
          defaultValue={workout.note}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          onBlur={(event) => {
            const note = event.target.value;
            if (note !== workout.note) {
              void run(() => updateNote(workout.id, note));
            }
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2"
        />
      </label>

      {/* 片手で押せるよう、主なボタンは画面の下（スマホはタブバーの上）に置く */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto max-w-2xl">
          {confirmingFinish ? (
            <div
              role="group"
              aria-label="終了の確認"
              className="flex items-center gap-2"
            >
              <span className="flex-1 text-sm">
                ワークアウトを終了しますか？
              </span>
              <button
                type="button"
                disabled={finishing}
                onClick={finish}
                className="min-h-11 rounded-lg bg-blue-600 px-4 font-bold text-white disabled:opacity-50"
              >
                終了する
              </button>
              <button
                type="button"
                onClick={() => setConfirmingFinish(false)}
                className="min-h-11 rounded-lg px-3 hover:bg-neutral-100"
              >
                戻る
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="min-h-11 flex-1 rounded-lg bg-blue-600 font-bold text-white"
              >
                種目を追加
              </button>
              <button
                type="button"
                onClick={() => setConfirmingFinish(true)}
                className="min-h-11 rounded-lg border border-neutral-300 px-4 hover:bg-neutral-100"
              >
                ワークアウトを終了
              </button>
            </div>
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        onSelect={(exercise) =>
          void run(() => addExercise(workout.id, exercise))
        }
        onClose={() => setPickerOpen(false)}
      />
    </main>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-2 px-4 py-6 text-sm">
      {children}
    </main>
  );
}

/** 開始からの経過時間（1 秒ごとに更新） */
function Elapsed({ since }: { since: string }) {
  const now = useNow();
  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`}
    </span>
  );
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
