"use client";

import { useState } from "react";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import type { ExerciseItem } from "@/lib/exercise";

/**
 * 種目選択（S-13）を試すための一時的なボタン。
 * 記録画面（#9）ができたら、そちらで使うようにしてこの部品は消す。
 */
export function PickerTrial({ exercises }: { exercises: ExerciseItem[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ExerciseItem>();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3 text-sm">
      <p className="text-neutral-500">
        種目選択の試し（記録画面ができたら、そちらに移します）
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-neutral-300 px-3 py-2 hover:bg-neutral-100"
      >
        種目を選ぶ（試し）
      </button>
      {selected && <p>選んだ種目：{selected.name}</p>}
      <ExercisePicker
        open={open}
        exercises={exercises}
        onSelect={setSelected}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
