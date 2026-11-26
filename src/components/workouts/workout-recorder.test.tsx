import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addExercise, startWorkout } from "@/client/workouts/actions";
import { localDb } from "@/client/workouts/local-db";
import { OFFLINE_DATA_URL } from "@/client/workouts/offline-data";
import {
  acceptingFetcher,
  BENCH,
  clearLocalDb,
} from "@/client/workouts/test-helpers";
import type { PreviousRecord } from "@/server/workouts/offline-data";
import { WorkoutRecorder } from "./workout-recorder";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
// 種目の追加はサーバーの処理なので、このテストでは使わない
vi.mock("@/server/exercises/actions", () => ({
  createExerciseAction: vi.fn(),
}));

const USER_ID = "0190a000-0000-7000-8000-0000000000aa";

const previous: PreviousRecord = {
  exerciseId: BENCH.id,
  performedOn: "2026-11-20",
  restSeconds: 90,
  sets: [
    { weightKg: 60, reps: 10, durationSeconds: null, distanceM: null },
    { weightKg: 62.5, reps: 8, durationSeconds: null, distanceM: null },
  ],
};

beforeEach(async () => {
  await clearLocalDb();
  // サーバーの代わり：種目と前回の記録を返し、送られた変更はすべて受け付ける
  const sync = acceptingFetcher();
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) =>
    input === OFFLINE_DATA_URL
      ? Response.json({
          exercises: [BENCH],
          previousRecords: [previous],
          routines: [],
          personalRecords: [],
        })
      : sync(input, init),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** ベンチプレスを追加したワークアウトを開く */
async function openRecorder() {
  await localDb.exercises.put(BENCH);
  await localDb.previousRecords.put(previous);
  const workout = await startWorkout();
  await addExercise(workout.id, BENCH);
  render(<WorkoutRecorder userId={USER_ID} />);
  return within(await screen.findByRole("region", { name: "ベンチプレス" }));
}

const input = (
  card: ReturnType<typeof within>,
  number: number,
  label: string,
) => card.getByRole("textbox", { name: `${number}セット目の${label}` });

describe("記録画面", () => {
  it("前回の記録が初期値に入り、前回の内容も表示する", async () => {
    const card = await openRecorder();
    expect(input(card, 1, "重量（kg）")).toHaveValue("60");
    expect(input(card, 1, "回数")).toHaveValue("10");
    expect(input(card, 2, "重量（kg）")).toHaveValue("62.5");
    expect(input(card, 2, "回数")).toHaveValue("8");
    expect(
      card.getByText("前回（11/20）：60kg×10、62.5kg×8"),
    ).toBeInTheDocument();
  });

  it("「セットを追加」で直前のセットを複製する", async () => {
    const card = await openRecorder();
    fireEvent.click(card.getByRole("button", { name: "セットを追加" }));
    await waitFor(() => {
      expect(input(card, 3, "重量（kg）")).toHaveValue("62.5");
    });
    expect(input(card, 3, "回数")).toHaveValue("8");
    expect(
      card.getByRole("button", { name: "3セット目を完了" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("±2.5kg ボタンで重量を変える", async () => {
    const card = await openRecorder();
    fireEvent.click(
      card.getByRole("button", { name: "1セット目の重量を2.5kg増やす" }),
    );
    await waitFor(() => {
      expect(input(card, 1, "重量（kg）")).toHaveValue("62.5");
    });
    fireEvent.click(
      card.getByRole("button", { name: "2セット目の重量を2.5kg減らす" }),
    );
    await waitFor(() => {
      expect(input(card, 2, "重量（kg）")).toHaveValue("60");
    });
  });

  it("入力欄を離れると、値を整えて保存する", async () => {
    const card = await openRecorder();
    const weight = input(card, 1, "重量（kg）");
    fireEvent.change(weight, { target: { value: "70.1" } });
    fireEvent.blur(weight);
    expect(weight).toHaveValue("70");
    await waitFor(async () => {
      const sets = await localDb.sets.toArray();
      expect(sets.find((set) => set.sortOrder === 0)?.weightKg).toBe(70);
    });
  });

  it("完了にでき、必要な項目が空なら理由を出す", async () => {
    const card = await openRecorder();
    fireEvent.click(card.getByRole("button", { name: "1セット目を完了" }));
    await waitFor(() => {
      expect(
        card.getByRole("button", { name: "1セット目を完了" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    const reps = input(card, 2, "回数");
    fireEvent.change(reps, { target: { value: "" } });
    fireEvent.blur(reps);
    await waitFor(() => {
      expect(input(card, 2, "回数")).toHaveValue("");
    });
    fireEvent.click(card.getByRole("button", { name: "2セット目を完了" }));
    expect(await card.findByRole("alert")).toHaveTextContent(
      "完了にするには回数を入れてください",
    );
  });

  it("操作したら送信待ちをサーバーへ送る", async () => {
    await openRecorder();
    await waitFor(async () => {
      expect(await localDb.outbox.count()).toBe(0);
    });
  });
});
