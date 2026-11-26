import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDb } from "@/client/workouts/local-db";
import { enqueue } from "@/client/workouts/outbox";
import {
  acceptingFetcher,
  BENCH,
  clearLocalDb,
} from "@/client/workouts/test-helpers";
import { newId } from "@/lib/id";
import { LogoutButton } from "./logout-button";

const logOutAction = vi.fn(async () => {});
vi.mock("@/server/auth/actions", () => ({
  logOutAction: () => logOutAction(),
}));

function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

async function addUnsent() {
  await enqueue({
    changeId: newId(),
    id: newId(),
    clientUpdatedAt: new Date().toISOString(),
    entity: "set",
    op: "delete",
  });
}

beforeEach(async () => {
  await clearLocalDb();
  await localDb.exercises.put(BENCH);
  logOutAction.mockClear();
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ログアウト", () => {
  it("未送信がなければ、端末のデータを消してすぐログアウトする", async () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(logOutAction).toHaveBeenCalled());
    expect(await localDb.exercises.count()).toBe(0);
  });

  it("未送信があれば先に送ってからログアウトする", async () => {
    await addUnsent();
    const fetcher = acceptingFetcher();
    vi.stubGlobal("fetch", fetcher);
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(logOutAction).toHaveBeenCalled());
    expect(fetcher.calls).toHaveLength(1);
  });

  it("送れずに残ったら警告し、「やめる」ならログアウトしない", async () => {
    await addUnsent();
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }));
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    const confirm = await screen.findByRole("group", {
      name: "ログアウトの確認",
    });
    expect(confirm).toHaveTextContent("未送信の記録が 1 件あります");
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));
    expect(logOutAction).not.toHaveBeenCalled();
    expect(await localDb.outbox.count()).toBe(1);
  });

  it("警告のあと「それでもログアウト」なら、データを消してログアウトする", async () => {
    await addUnsent();
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }));
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "それでもログアウト" }),
    );
    await waitFor(() => expect(logOutAction).toHaveBeenCalled());
    expect(await localDb.outbox.count()).toBe(0);
  });

  it("圏外ではログアウトできないことを伝える", async () => {
    setOnline(false);
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "圏外ではログアウトできません",
    );
    expect(logOutAction).not.toHaveBeenCalled();
  });
});
