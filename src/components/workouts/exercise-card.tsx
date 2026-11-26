"use client";

import { useState, type ReactNode } from "react";
import type { WorkoutExerciseView } from "@/client/workouts/use-workout";
import { toShortDate } from "@/lib/date";
import { EXERCISE_KIND_LABELS, type ExerciseKind } from "@/lib/exercise";
import type { SetFields } from "@/lib/workout-set";
import {
  FIELDS_BY_KIND,
  SetHeader,
  SetRow,
  type SetRowHandlers,
} from "./set-row";

export type ExerciseCardHandlers = SetRowHandlers & {
  onMove: (workoutExerciseId: string, direction: -1 | 1) => void;
  onRemoveExercise: (workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
};

/** 記録画面の種目 1 つ分：前回の記録・セットの一覧・並べ替え・削除 */
export function ExerciseCard({
  view,
  isFirst,
  isLast,
  handlers,
}: {
  view: WorkoutExerciseView;
  isFirst: boolean;
  isLast: boolean;
  handlers: ExerciseCardHandlers;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { item, exercise, previous, sets } = view;
  const name = exercise?.name ?? "（種目を読み込み中）";
  // 種目を取る前は種別が分からないので、重量の種目として出しておく
  const kind: ExerciseKind = exercise?.kind ?? "WEIGHT";
  const headingId = `exercise-${item.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-neutral-200 bg-white px-2 py-3"
    >
      <div className="flex items-center gap-1 px-1">
        <h2 id={headingId} className="min-w-0 flex-1 truncate font-bold">
          {name}
        </h2>
        <span className="shrink-0 text-xs text-neutral-500">
          {EXERCISE_KIND_LABELS[kind]}
        </span>
        <IconButton
          label={`${name}を上へ移動`}
          disabled={isFirst}
          onClick={() => handlers.onMove(item.id, -1)}
        >
          ↑
        </IconButton>
        <IconButton
          label={`${name}を下へ移動`}
          disabled={isLast}
          onClick={() => handlers.onMove(item.id, 1)}
        >
          ↓
        </IconButton>
        <IconButton
          label={`${name}を削除`}
          onClick={() => setConfirmingRemove(true)}
        >
          <span className="text-xs">削除</span>
        </IconButton>
      </div>

      {confirmingRemove && (
        <div
          role="group"
          aria-label={`${name}の削除の確認`}
          className="mx-1 mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm"
        >
          <span className="flex-1">セットごと削除しますか？</span>
          <button
            type="button"
            onClick={() => handlers.onRemoveExercise(item.id)}
            className="min-h-11 rounded-lg bg-red-600 px-3 text-white"
          >
            削除する
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="min-h-11 rounded-lg px-3 hover:bg-neutral-100"
          >
            やめる
          </button>
        </div>
      )}

      {previous && previous.sets.length > 0 && (
        <p className="mt-1 px-1 text-xs text-neutral-500">
          前回（{toShortDate(previous.performedOn)}）：
          {previous.sets.map((set) => describeSet(kind, set)).join("、")}
        </p>
      )}

      <div className="mt-2">
        <SetHeader kind={kind} />
      </div>
      <ol aria-label={`${name}のセット`} className="mt-1 flex flex-col gap-1">
        {sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            number={index + 1}
            kind={kind}
            handlers={handlers}
          />
        ))}
      </ol>

      <button
        type="button"
        onClick={() => handlers.onAddSet(item.id)}
        className="mt-2 min-h-11 w-full rounded-lg border border-dashed border-neutral-300 text-sm text-blue-600 hover:bg-neutral-50"
      >
        セットを追加
      </button>
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** 前回の記録の 1 セットを短い文字にする（例 "60kg×10"） */
export function describeSet(kind: ExerciseKind, set: SetFields): string {
  const parts = FIELDS_BY_KIND[kind]
    .map((spec) => {
      const value = set[spec.field];
      if (value === null) return null;
      switch (spec.field) {
        case "weightKg":
          return `${value}kg`;
        case "reps":
          return `${value}回`;
        case "durationSeconds":
          return kind === "CARDIO" ? `${spec.format(value)}分` : `${value}秒`;
        case "distanceM":
          return `${spec.format(value)}km`;
      }
    })
    .filter((part) => part !== null);
  // 重量の種目は「60kg×10」の形にする
  if (kind === "WEIGHT" && parts.length === 2) {
    return `${set.weightKg}kg×${set.reps}`;
  }
  return parts.length > 0 ? parts.join(" ") : "—";
}
