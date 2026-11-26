import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { finishWorkout, startWorkout } from "@/client/workouts/actions";
import { clearLocalDb } from "@/client/workouts/test-helpers";
import { RecordingBar } from "./recording-bar";

let pathname = "/exercises";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

beforeEach(async () => {
  await clearLocalDb();
  pathname = "/exercises";
});

describe("「記録中」のバー", () => {
  it("記録中のワークアウトがあれば、記録画面へのリンクを出す", async () => {
    await startWorkout();
    render(<RecordingBar />);
    const link = await screen.findByRole("link", { name: /記録中/ });
    expect(link).toHaveAttribute("href", "/workouts/current");
  });

  it("記録中のものがなければ出さない", async () => {
    const workout = await startWorkout();
    await finishWorkout(workout.id);
    render(<RecordingBar />);
    // 端末のデータを読み終えるのを待ってから確かめる
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("link", { name: /記録中/ })).toBeNull();
  });

  it("記録画面そのものでは出さない", async () => {
    await startWorkout();
    pathname = "/workouts/current";
    render(<RecordingBar />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("link", { name: /記録中/ })).toBeNull();
  });
});
