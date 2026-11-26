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
  /** 列の見出し（セットの一覧の上に出す） */
  heading: string;
  /** 空欄のときに薄く出す単位 */
  unit: string;
  parse: (text: string) => number | null;
  format: (value: number | null) => string;
  /** ±2.5kg ボタンを付けるか */
  stepper?: boolean;
};

const weight = (label: string, heading: string): FieldSpec => ({
  field: "weightKg",
  label,
  heading,
  unit: "kg",
  parse: parseWeight,
  format: formatNumber,
  stepper: true,
});

/** 種別ごとの入力欄（F-12）。左から順に並べる */
export const FIELDS_BY_KIND: Record<ExerciseKind, FieldSpec[]> = {
  WEIGHT: [
    weight("重量（kg）", "重量"),
    {
      field: "reps",
      label: "回数",
      heading: "回数",
      unit: "回",
      parse: parseReps,
      format: formatNumber,
    },
  ],
  BODYWEIGHT: [
    {
      field: "reps",
      label: "回数",
      heading: "回数",
      unit: "回",
      parse: parseReps,
      format: formatNumber,
    },
    weight("加重（kg）", "加重"),
  ],
  TIMED: [
    {
      field: "durationSeconds",
      label: "時間（秒）",
      heading: "時間",
      unit: "秒",
      parse: parseSeconds,
      format: formatNumber,
    },
    weight("加重（kg）", "加重"),
  ],
  CARDIO: [
    {
      field: "durationSeconds",
      label: "時間（分）",
      heading: "時間",
      unit: "分",
      parse: parseMinutes,
      format: formatMinutes,
    },
    {
      field: "distanceM",
      label: "距離（km）",
      heading: "距離",
      unit: "km",
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

/**
 * セットの一覧の見出し行。入力欄と同じ幅で並べ、どの欄が重量・回数かを示す。
 * 入力欄には aria-label があるので、読み上げでは見出しを読まない。
 */
export function SetHeader({ kind }: { kind: ExerciseKind }) {
  return (
    <div
      aria-hidden="true"
      className="flex items-end gap-1 px-1 text-[11px] leading-tight text-neutral-500"
    >
      <span className="w-6 shrink-0 text-center">セット</span>
      {FIELDS_BY_KIND[kind].map((spec) => (
        <div key={spec.field} className="flex gap-1">
          {spec.stepper && <span className="w-11 shrink-0" />}
          <span className="w-14 shrink-0 text-center">
            {spec.heading}
            <br />（{spec.unit}）
          </span>
          {spec.stepper && <span className="w-11 shrink-0" />}
        </div>
      ))}
      <span className="ml-auto w-11 shrink-0 text-center">完了</span>
      <span className="w-11 shrink-0" />
    </div>
  );
}

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
              unit={spec.unit}
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
  unit,
  value,
  parse,
  format,
  onCommit,
}: {
  label: string;
  unit: string;
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
      placeholder={unit}
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
