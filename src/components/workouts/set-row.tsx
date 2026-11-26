"use client";

import { useState, type KeyboardEvent } from "react";
import type { LocalSet } from "@/client/workouts/local-db";
import {
  formatKilometers,
  formatMinutes,
  formatNumber,
  parseKilometers,
  parseMinutes,
  parseReps,
  parseSeconds,
  parseWeight,
} from "@/client/workouts/set-input";
import type { ExerciseKind } from "@/lib/exercise";
import type { SetFields } from "@/lib/workout-set";

export const WEIGHT_STEP_KG = 2.5;

type FieldSpec = {
  field: keyof SetFields;
  label: string;
  parse: (text: string) => number | null;
  format: (value: number | null) => string;
  /** ±2.5kg ボタンを付けるか */
  stepper?: boolean;
};

const weight = (label: string): FieldSpec => ({
  field: "weightKg",
  label,
  parse: parseWeight,
  format: formatNumber,
  stepper: true,
});

/** 種別ごとの入力欄（F-12）。左から順に並べる */
export const FIELDS_BY_KIND: Record<ExerciseKind, FieldSpec[]> = {
  WEIGHT: [
    weight("重量（kg）"),
    { field: "reps", label: "回数", parse: parseReps, format: formatNumber },
  ],
  BODYWEIGHT: [
    { field: "reps", label: "回数", parse: parseReps, format: formatNumber },
    weight("加重（kg）"),
  ],
  TIMED: [
    {
      field: "durationSeconds",
      label: "時間（秒）",
      parse: parseSeconds,
      format: formatNumber,
    },
    weight("加重（kg）"),
  ],
  CARDIO: [
    {
      field: "durationSeconds",
      label: "時間（分）",
      parse: parseMinutes,
      format: formatMinutes,
    },
    {
      field: "distanceM",
      label: "距離（km）",
      parse: parseKilometers,
      format: formatKilometers,
    },
  ],
};

const buttonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-xs hover:bg-neutral-100";
const inputClass =
  "h-11 w-14 min-w-0 rounded-lg border border-neutral-300 px-1 text-center tabular-nums";

export type SetRowHandlers = {
  onChange: (setId: string, fields: Partial<SetFields>) => void;
  onStepWeight: (setId: string, delta: number) => void;
  onToggleComplete: (setId: string) => Promise<string | null>;
  onRemove: (setId: string) => void;
};

/** セット 1 行：種別ごとの入力欄・完了・削除 */
export function SetRow({
  set,
  number,
  kind,
  handlers,
}: {
  set: LocalSet;
  /** 何セット目か（1 から） */
  number: number;
  kind: ExerciseKind;
  handlers: SetRowHandlers;
}) {
  const [error, setError] = useState<string | null>(null);
  const completed = set.completedAt !== null;
  const prefix = `${number}セット目`;

  return (
    <li className={`rounded-lg px-1 py-1 ${completed ? "bg-green-50" : ""}`}>
      <div className="flex items-center gap-1">
        <span className="w-6 shrink-0 text-center text-sm text-neutral-500">
          {number}
        </span>
        {FIELDS_BY_KIND[kind].map((spec) => (
          <div key={spec.field} className="flex items-center gap-1">
            {spec.stepper && (
              <button
                type="button"
                aria-label={`${prefix}の重量を${WEIGHT_STEP_KG}kg減らす`}
                onClick={() => handlers.onStepWeight(set.id, -WEIGHT_STEP_KG)}
                className={buttonClass}
              >
                −{WEIGHT_STEP_KG}
              </button>
            )}
            <NumberInput
              label={`${prefix}の${spec.label}`}
              value={set[spec.field]}
              parse={spec.parse}
              format={spec.format}
              onCommit={(value) => {
                setError(null);
                handlers.onChange(set.id, { [spec.field]: value });
              }}
            />
            {spec.stepper && (
              <button
                type="button"
                aria-label={`${prefix}の重量を${WEIGHT_STEP_KG}kg増やす`}
                onClick={() => handlers.onStepWeight(set.id, WEIGHT_STEP_KG)}
                className={buttonClass}
              >
                +{WEIGHT_STEP_KG}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          aria-label={`${prefix}を完了`}
          aria-pressed={completed}
          onClick={async () =>
            setError(await handlers.onToggleComplete(set.id))
          }
          className={`${buttonClass} ml-auto text-base ${
            completed ? "border-green-600 bg-green-600 text-white" : ""
          }`}
        >
          ✓
        </button>
        <button
          type="button"
          aria-label={`${prefix}を削除`}
          onClick={() => handlers.onRemove(set.id)}
          className={`${buttonClass} border-transparent text-base text-neutral-500`}
        >
          ×
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 ml-7 text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

/**
 * 数値の入力欄。入力中は自由に打てて、欄を離れたとき（Enter でも）に値を整えて保存する。
 * 保存した値が変わると key が変わって作り直され、新しい値が表示される（±ボタンで変えたときなど）。
 */
function NumberInput({
  label,
  value,
  parse,
  format,
  onCommit,
}: {
  label: string;
  value: number | null;
  parse: (text: string) => number | null;
  format: (value: number | null) => string;
  onCommit: (value: number | null) => void;
}) {
  return (
    <input
      key={formatNumber(value)}
      type="text"
      inputMode="decimal"
      aria-label={label}
      defaultValue={format(value)}
      onBlur={(event) => {
        const next = parse(event.target.value);
        event.target.value = format(next);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={inputClass}
    />
  );
}
