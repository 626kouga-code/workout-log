import { beforeEach, describe, expect, it, vi } from "vitest";
import { newId } from "@/lib/id";
import type { ChangeInput } from "@/lib/validation/workout-sync";
import { localDb } from "./local-db";
import { countOutbox, enqueue, flushOutbox, SYNC_URL } from "./outbox";
import { acceptingFetcher, clearLocalDb } from "./test-helpers";

function deleteSet(): ChangeInput {
  return {
    changeId: newId(),
    id: newId(),
    clientUpdatedAt: new Date().toISOString(),
    entity: "set",
    op: "delete",
  };
}

async function outboxIds(): Promise<string[]> {
  return (await localDb.outbox.orderBy("seq").toArray()).map(
    (item) => item.change.changeId,
  );
}

beforeEach(clearLocalDb);

describe("送信待ちキュー", () => {
  it("追加した順に送り、送れたら消す", async () => {
    const changes = [deleteSet(), deleteSet(), deleteSet()];
    await enqueue(changes[0]);
    await enqueue(changes[1], changes[2]);
    const fetcher = acceptingFetcher();

    expect(await flushOutbox(fetcher)).toBe("done");
    expect(fetcher.calls).toEqual([changes.map((change) => change.changeId)]);
    expect(await countOutbox()).toBe(0);
  });

  it("同期 API へ JSON で POST する", async () => {
    await enqueue(deleteSet());
    const fetcher = vi.fn(acceptingFetcher());
    await flushOutbox(fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      SYNC_URL,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("通信できなければ、消さずに残す", async () => {
    const changes = [deleteSet(), deleteSet()];
    await enqueue(...changes);
    const result = await flushOutbox(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(result).toBe("failed");
    expect(await outboxIds()).toEqual(changes.map((change) => change.changeId));
  });

  it("サーバーがエラーを返したら、消さずに残す", async () => {
    await enqueue(deleteSet());
    const result = await flushOutbox(async () =>
      Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }),
    );
    expect(result).toBe("failed");
    expect(await countOutbox()).toBe(1);
  });

  it("結果が返ってきた変更だけを消す（結果の種類は問わない）", async () => {
    const [a, b, c] = [deleteSet(), deleteSet(), deleteSet()];
    await enqueue(a, b, c);
    const result = await flushOutbox(async () =>
      Response.json({
        results: [
          { changeId: a.changeId, status: "rejected", reason: "不正" },
          { changeId: c.changeId, status: "ignored" },
        ],
        autoFinished: [],
        personalRecords: [],
      }),
    );
    // b は残ったまま。同じものを送り続けないよう、いったん止める
    expect(result).toBe("failed");
    expect(await outboxIds()).toEqual([b.changeId]);
  });

  it("200 件を超えたら分けて送る", async () => {
    const changes = Array.from({ length: 450 }, deleteSet);
    await enqueue(...changes);
    const fetcher = acceptingFetcher();
    await flushOutbox(fetcher);
    expect(fetcher.calls.map((call) => call.length)).toEqual([200, 200, 50]);
    expect(fetcher.calls.flat()).toEqual(
      changes.map((change) => change.changeId),
    );
    expect(await countOutbox()).toBe(0);
  });

  it("送っている間に呼ばれても二重に送らず、終わってから追加分を送る", async () => {
    const first = deleteSet();
    await enqueue(first);
    const fetcher = acceptingFetcher();
    const one = flushOutbox(fetcher);
    const second = deleteSet();
    await enqueue(second);
    const two = flushOutbox(fetcher);
    await Promise.all([one, two]);
    expect(fetcher.calls.flat()).toEqual([first.changeId, second.changeId]);
    expect(await countOutbox()).toBe(0);
  });

  it("サーバーが自動で終了にしたワークアウトを、端末でも終了にする", async () => {
    const base = {
      performedOn: "2026-11-26",
      note: "",
      clientUpdatedAt: "2026-11-26T00:00:00.000Z",
      finishedAt: null,
    };
    await localDb.workouts.bulkAdd([
      { ...base, id: newId(), startedAt: "2026-11-26T01:00:00.000Z" },
      { ...base, id: newId(), startedAt: "2026-11-26T02:00:00.000Z" },
    ]);
    const [old, kept] = await localDb.workouts.orderBy("id").toArray();
    await enqueue(deleteSet());

    await flushOutbox(acceptingFetcher({ autoFinished: [old.id] }));

    expect((await localDb.workouts.get(old.id))?.finishedAt).toBe(
      kept.startedAt,
    );
    expect((await localDb.workouts.get(kept.id))?.finishedAt).toBeNull();
    // サーバーで決まったことなので、送り返さない
    expect(await countOutbox()).toBe(0);
  });
});
