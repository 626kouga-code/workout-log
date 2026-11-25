"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { applyActionError } from "@/components/form/apply-action-error";
import {
  describedBy,
  Field,
  FormError,
  inputClass,
  SubmitButton,
} from "@/components/form/field";
import type { ActionResult } from "@/lib/action-result";
import {
  BODY_PART_LABELS,
  BODY_PARTS,
  EXERCISE_KIND_LABELS,
  EXERCISE_KINDS,
  type ExerciseItem,
} from "@/lib/exercise";
import {
  exerciseSchema,
  type ExerciseData,
  type ExerciseInput,
} from "@/lib/validation/exercise";

const FIELDS = ["name", "bodyPart", "kind"] as const;

/**
 * 自分の種目の入力フォーム（名前・部位・種別）。追加・編集・種目選択からの追加で共通に使う。
 * 保存の処理は onSubmit で受け取り、成功したら onDone を呼ぶ。
 */
export function ExerciseForm({
  idPrefix,
  defaultValues,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: {
  /** 同じ画面に複数のフォームを置いても、入力欄の id が重ならないようにする */
  idPrefix: string;
  defaultValues?: Partial<ExerciseInput>;
  submitLabel: string;
  onSubmit: (values: ExerciseData) => Promise<ActionResult<ExerciseItem>>;
  onDone: (exercise: ExerciseItem) => void;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseInput, unknown, ExerciseData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      bodyPart: defaultValues?.bodyPart ?? "CHEST",
      kind: defaultValues?.kind ?? "WEIGHT",
    },
  });

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (!result.ok) {
      applyActionError(result.error, setError, FIELDS);
      return;
    }
    reset();
    onDone(result.data);
  });

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <FormError message={errors.root?.message} />
      <Field id={id("name")} label="種目名" error={errors.name?.message}>
        <input
          id={id("name")}
          autoComplete="off"
          className={inputClass(!!errors.name)}
          {...describedBy(id("name"), { error: errors.name?.message })}
          {...register("name")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={id("bodyPart")}
          label="部位"
          error={errors.bodyPart?.message}
        >
          <select
            id={id("bodyPart")}
            className={inputClass(!!errors.bodyPart)}
            {...register("bodyPart")}
          >
            {BODY_PARTS.map((part) => (
              <option key={part} value={part}>
                {BODY_PART_LABELS[part]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("kind")} label="種別" error={errors.kind?.message}>
          <select
            id={id("kind")}
            className={inputClass(!!errors.kind)}
            {...register("kind")}
          >
            {EXERCISE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EXERCISE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton pending={isSubmitting}>
          {isSubmitting ? "保存しています…" : submitLabel}
        </SubmitButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-neutral-300 px-4 hover:bg-neutral-100"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
