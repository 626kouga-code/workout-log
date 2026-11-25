import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExerciseItem } from "@/lib/exercise";
import { ExercisePickerContent } from "./exercise-picker";

// 種目の追加はサーバーの処理なので、このテストでは使わない
vi.mock("@/server/exercises/actions", () => ({
  createExerciseAction: vi.fn(),
}));

const item = (
  name: string,
  bodyPart: ExerciseItem["bodyPart"],
  extra: Partial<ExerciseItem> = {},
): ExerciseItem => ({
  id: name,
  name,
  bodyPart,
  kind: "WEIGHT",
  isPreset: true,
  hidden: false,
  ...extra,
});

const exercises = [
  item("ベンチプレス", "CHEST"),
  item("ダンベルプレス", "CHEST"),
  item("スクワット", "LEGS"),
  item("ショルダープレス", "SHOULDERS"),
  item("昔の種目", "CHEST", { isPreset: false, hidden: true }),
];

const names = () =>
  within(screen.getByRole("list", { name: "種目" }))
    .getAllByRole("button")
    .map((button) => button.firstChild?.textContent);

describe("種目選択", () => {
  it("最初はすべての種目を出し、非表示の種目は出さない", () => {
    render(<ExercisePickerContent exercises={exercises} onSelect={vi.fn()} />);
    expect(names()).toEqual([
      "ベンチプレス",
      "ダンベルプレス",
      "スクワット",
      "ショルダープレス",
    ]);
  });

  it("部位で絞り込める", () => {
    render(<ExercisePickerContent exercises={exercises} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "胸" }));
    expect(names()).toEqual(["ベンチプレス", "ダンベルプレス"]);
    expect(screen.getByRole("button", { name: "胸" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("名前で検索でき、部位の絞り込みと組み合わせられる", () => {
    render(<ExercisePickerContent exercises={exercises} onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "種目名で検索" }), {
      target: { value: "ぷれす" },
    });
    expect(names()).toEqual([
      "ベンチプレス",
      "ダンベルプレス",
      "ショルダープレス",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "肩" }));
    expect(names()).toEqual(["ショルダープレス"]);
  });

  it("見つからなければそう表示する", () => {
    render(<ExercisePickerContent exercises={exercises} onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ない種目" },
    });
    expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("押した種目を返す", () => {
    const onSelect = vi.fn();
    render(<ExercisePickerContent exercises={exercises} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /スクワット/ }));
    expect(onSelect).toHaveBeenCalledWith(exercises[2]);
  });
});
