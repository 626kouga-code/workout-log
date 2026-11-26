import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueue } from "@/client/workouts/outbox";
import { clearLocalDb } from "@/client/workouts/test-helpers";
import { newId } from "@/lib/id";
import { SyncStatus } from "./sync-status";

async function addUnsent(count: number) {
  for (let i = 0; i < count; i++) {
    await enqueue({
      changeId: newId(),
      id: newId(),
      clientUpdatedAt: new Date().toISOString(),
      entity: "set",
      op: "delete",
    });
  }
}

beforeEach(clearLocalDb);
afterEach(() => {
  vi.restoreAllMocks();
});

describe("未送信の表示", () => {
  it("圏外なら、未送信の件数と自動で送ることを出す", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await addUnsent(3);
    render(<SyncStatus />);
    expect(await screen.findByText(/未送信 3 件/)).toHaveTextContent(
      "通信が戻ったら自動で送ります",
    );
  });

  it("未送信がなければ何も出さない", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<SyncStatus />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/未送信/)).toBeNull();
  });

  it("通信できるときは、送り終えるまでの少しの間は出さない", async () => {
    await addUnsent(1);
    render(<SyncStatus />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/未送信/)).toBeNull();
    expect(
      await screen.findByText("未送信 1 件", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
