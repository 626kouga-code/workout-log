"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  addExercise,
  addSet,
  findInProgressWorkout,
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
import { goTo, OfflineSafeLink } from "@/components/offline-safe-link";
import { toJstTime } from "@/lib/date";
import { summaryPage } from "@/lib/offline-pages";
import { NOTE_MAX_LENGTH } from "@/lib/validation/workout-sync";
import { Elapsed } from "./elapsed";
import { ExerciseCard, type ExerciseCardHandlers } from "./exercise-card";
import { SyncStatus } from "./sync-status";

/**
 * 記録画面（S-11）。記録中のワークアウト（常に 1 件まで）を端末のデータ（IndexedDB）から読んで表示し、
 * 操作は端末に保存してから送る。
 * URL を /workouts/current の 1 つにしているのは、圏外で始めたワークアウトでも、
 * Service Worker が保存しておいた同じ画面で開けるようにするため。
 */
export function WorkoutRecorder({ userId }: { userId: string }) {
  useAutoSync(userId);
  const router = useRouter();
  // 読み込み中は undefined、記録中のものがなければ null
  const inProgress = useLiveQuery(
    async () => (await findInProgressWorkout()) ?? null,
    [],
  );
  // 終了した直後は「記録中」ではなくなるが、完了画面へ移るまでは表示を続ける
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const workoutId = finishingId ?? inProgress?.id;
  const view = useWorkout(workoutId);
  const exercises = useLiveQuery(() => localDb.exercises.toArray(), [], []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
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

  async function finish(id: string) {
    setFinishingId(id);
    setError(null);
    try {
      await finishWorkout(id);
    } catch {
      setError("終了できませんでした");
      setFinishingId(null);
      return;
    }
    // 送り終えてから前回の記録を取り直す（次のワークアウトの初期値になる）
    void flushOutbox().then(() => refreshOfflineData());
    goTo(router.push, summaryPage(id));
  }

  if (inProgress === undefined || (workoutId && view === undefined)) {
    return <p className="px-4 py-6 text-sm text-neutral-500">読み込み中…</p>;
  }
  if (!view) {
    return (
      <Message>
        記録中のワークアウトはありません。
        <OfflineSafeLink href="/workouts" className="text-blue-600 underline">
          記録トップへ
        </OfflineSafeLink>
      </Message>
    );
  }
  const { workout } = view;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pt-4 pb-40">
      <header className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-bold">記録中</h1>
        <p className="text-sm text-neutral-500">
          {toJstTime(new Date(workout.startedAt))} 開始・経過{" "}
          <Elapsed since={workout.startedAt} />
        </p>
      </header>

      <SyncStatus />

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
                disabled={finishingId !== null}
                onClick={() => finish(workout.id)}
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
