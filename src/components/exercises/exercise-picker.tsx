"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BODY_PART_LABELS,
  BODY_PARTS,
  EXERCISE_KIND_LABELS,
  type BodyPart,
  type ExerciseItem,
} from "@/lib/exercise";
import { matchesSearch } from "@/lib/search";
import { createExerciseAction } from "@/server/exercises/actions";
import { ExerciseForm } from "./exercise-form";

/**
 * 種目選択（S-13）。画面の上に重ねて出すモーダル。
 * HTML の <dialog> を使うので、Esc キーや「閉じる」で閉じられ、後ろの画面は操作できなくなる。
 * 記録画面（#9）・メニュー編集（#13）から使う。
 */
export function ExercisePicker({
  open,
  exercises,
  onSelect,
  onClose,
}: {
  open: boolean;
  exercises: ExerciseItem[];
  onSelect: (exercise: ExerciseItem) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto h-[85dvh] w-[min(36rem,calc(100%-2rem))] rounded-xl p-0 backdrop:bg-black/40"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 id={titleId} className="font-bold">
              種目を選ぶ
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm hover:bg-neutral-100"
            >
              閉じる
            </button>
          </div>
          <ExercisePickerContent
            exercises={exercises}
            onSelect={(exercise) => {
              onSelect(exercise);
              onClose();
            }}
          />
        </div>
      )}
    </dialog>
  );
}

/** 種目選択の中身：部位で絞り込み、名前で検索、選ぶ、自分の種目を追加する */
export function ExercisePickerContent({
  exercises,
  onSelect,
}: {
  exercises: ExerciseItem[];
  onSelect: (exercise: ExerciseItem) => void;
}) {
  const [bodyPart, setBodyPart] = useState<BodyPart | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const visible = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          !exercise.hidden &&
          (bodyPart === "ALL" || exercise.bodyPart === bodyPart) &&
          matchesSearch(exercise.name, query),
      ),
    [exercises, bodyPart, query],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 px-4 py-3">
        <input
          type="search"
          aria-label="種目名で検索"
          placeholder="種目名で検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2"
        />
        <div
          role="group"
          aria-label="部位で絞り込む"
          className="flex gap-1 overflow-x-auto pb-1"
        >
          {(["ALL", ...BODY_PARTS] as const).map((part) => (
            <button
              key={part}
              type="button"
              aria-pressed={bodyPart === part}
              onClick={() => setBodyPart(part)}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                bodyPart === part
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-neutral-300"
              }`}
            >
              {part === "ALL" ? "すべて" : BODY_PART_LABELS[part]}
            </button>
          ))}
        </div>
      </div>

      <ul
        aria-label="種目"
        className="min-h-0 flex-1 overflow-y-auto border-t border-neutral-200"
      >
        {visible.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onSelect(exercise)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
            >
              <span>{exercise.name}</span>
              <span className="text-xs text-neutral-500">
                {BODY_PART_LABELS[exercise.bodyPart]}・
                {EXERCISE_KIND_LABELS[exercise.kind]}
              </span>
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            見つかりませんでした
          </li>
        )}
      </ul>

      <div className="border-t border-neutral-200 px-4 py-3">
        {adding ? (
          <ExerciseForm
            idPrefix="picker-new"
            defaultValues={{
              name: query.trim(),
              bodyPart: bodyPart === "ALL" ? undefined : bodyPart,
            }}
            submitLabel="追加して選ぶ"
            onSubmit={createExerciseAction}
            onDone={onSelect}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-blue-600 underline"
          >
            自分の種目を追加
          </button>
        )}
      </div>
    </div>
  );
}
