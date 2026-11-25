"use client";

import { useState, useTransition } from "react";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import type { ActionResult } from "@/lib/action-result";
import {
  BODY_PART_LABELS,
  BODY_PARTS,
  EXERCISE_KIND_LABELS,
  type ExerciseItem,
} from "@/lib/exercise";
import {
  createExerciseAction,
  deleteExerciseAction,
  hideExerciseAction,
  unhideExerciseAction,
  updateExerciseAction,
} from "@/server/exercises/actions";

/** 種目の管理（S-14）の中身。データはサーバーから受け取り、操作のたびにサーバーで取り直す */
export function ExerciseManager({ exercises }: { exercises: ExerciseItem[] }) {
  const own = exercises.filter((e) => !e.isPreset && !e.hidden);
  const hidden = exercises.filter((e) => !e.isPreset && e.hidden);
  const presets = exercises.filter((e) => e.isPreset);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="add-title" className="flex flex-col gap-3">
        <h2 id="add-title" className="font-bold">
          種目を追加
        </h2>
        <ExerciseForm
          idPrefix="new"
          submitLabel="追加する"
          onSubmit={createExerciseAction}
          onDone={() => {}}
        />
      </section>

      <section aria-labelledby="own-title" className="flex flex-col gap-3">
        <h2 id="own-title" className="font-bold">
          自分の種目
        </h2>
        {own.length === 0 ? (
          <p className="text-sm text-neutral-500">
            まだありません。上のフォームから追加できます。
          </p>
        ) : (
          <GroupedList
            exercises={own}
            render={(e) => <OwnRow exercise={e} />}
          />
        )}
      </section>

      {hidden.length > 0 && (
        <section aria-labelledby="hidden-title" className="flex flex-col gap-3">
          <h2 id="hidden-title" className="font-bold">
            非表示の種目
          </h2>
          <p className="text-sm text-neutral-500">
            種目選択には出ません。過去の記録はそのまま残っています。
          </p>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {hidden.map((e) => (
              <HiddenRow key={e.id} exercise={e} />
            ))}
          </ul>
        </section>
      )}

      <details className="rounded-lg border border-neutral-200 px-4 py-3">
        <summary className="cursor-pointer font-bold">
          最初から用意されている種目（{presets.length}）
        </summary>
        <div className="mt-3">
          <GroupedList
            exercises={presets}
            render={(e) => (
              <div className="flex justify-between px-3 py-2">
                <span>{e.name}</span>
                <KindLabel exercise={e} />
              </div>
            )}
          />
        </div>
      </details>
    </div>
  );
}

/** 部位ごとに見出しを付けて並べる */
function GroupedList({
  exercises,
  render,
}: {
  exercises: ExerciseItem[];
  render: (exercise: ExerciseItem) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {BODY_PARTS.map((part) => {
        const items = exercises.filter((e) => e.bodyPart === part);
        if (items.length === 0) return null;
        return (
          <div key={part}>
            <h3 className="mb-1 text-sm text-neutral-500">
              {BODY_PART_LABELS[part]}
            </h3>
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {items.map((e) => (
                <li key={e.id}>{render(e)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function KindLabel({ exercise }: { exercise: ExerciseItem }) {
  return (
    <span className="text-xs text-neutral-500">
      {EXERCISE_KIND_LABELS[exercise.kind]}
    </span>
  );
}

/** 操作ボタンの共通の動き：押している間は押せなくし、失敗したらメッセージを出す */
function useRowAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(undefined);
      const result = await action();
      if (!result.ok) setError(result.error.message);
    });
  return { pending, error, run };
}

function RowButton(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
    />
  );
}

function OwnRow({ exercise }: { exercise: ExerciseItem }) {
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useRowAction();

  if (editing) {
    return (
      <div className="px-3 py-3">
        <ExerciseForm
          idPrefix={`edit-${exercise.id}`}
          defaultValues={exercise}
          submitLabel="保存する"
          onSubmit={(values) => updateExerciseAction(exercise.id, values)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {exercise.name} <KindLabel exercise={exercise} />
        </span>
        <span className="flex gap-1">
          <RowButton
            onClick={() => setEditing(true)}
            aria-label={`${exercise.name}を編集`}
          >
            編集
          </RowButton>
          <RowButton
            disabled={pending}
            onClick={() => run(() => hideExerciseAction(exercise.id))}
            aria-label={`${exercise.name}を非表示`}
          >
            非表示
          </RowButton>
          <DeleteButton exercise={exercise} pending={pending} run={run} />
        </span>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function HiddenRow({ exercise }: { exercise: ExerciseItem }) {
  const { pending, error, run } = useRowAction();
  return (
    <li className="flex flex-col gap-1 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-neutral-500">
          {exercise.name}（{BODY_PART_LABELS[exercise.bodyPart]}）
        </span>
        <span className="flex gap-1">
          <RowButton
            disabled={pending}
            onClick={() => run(() => unhideExerciseAction(exercise.id))}
            aria-label={`${exercise.name}を再表示`}
          >
            再表示
          </RowButton>
          <DeleteButton exercise={exercise} pending={pending} run={run} />
        </span>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

function DeleteButton({
  exercise,
  pending,
  run,
}: {
  exercise: ExerciseItem;
  pending: boolean;
  run: (action: () => Promise<ActionResult>) => void;
}) {
  return (
    <RowButton
      disabled={pending}
      onClick={() => {
        if (window.confirm(`「${exercise.name}」を削除しますか？`)) {
          run(() => deleteExerciseAction(exercise.id));
        }
      }}
      aria-label={`${exercise.name}を削除`}
    >
      削除
    </RowButton>
  );
}
