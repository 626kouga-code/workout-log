import {
  MAX_CHANGES_PER_SYNC,
  type ChangeInput,
  type SyncResponse,
} from "@/lib/validation/workout-sync";
import { localDb } from "./local-db";

export const SYNC_URL = "/api/workouts/sync";

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** fetch をそのまま渡すと this が外れるブラウザがあるため、包んで呼ぶ */
const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

/**
 * 送信待ちに変更を積む。
 * 端末のデータを書き換えるトランザクションの中で呼び、画面のデータと送信待ちがずれないようにする。
 */
export async function enqueue(...changes: ChangeInput[]): Promise<void> {
  await localDb.outbox.bulkAdd(changes.map((change) => ({ change })));
}

/** 送信待ちの件数 */
export function countOutbox(): Promise<number> {
  return localDb.outbox.count();
}

/**
 * - done: 送信待ちを全部送れた
 * - failed: 通信できない・サーバーのエラーなどで送れなかった（送れなかった分は残っている）
 */
export type FlushResult = "done" | "failed";

let running: Promise<FlushResult> | null = null;
let requestedAgain = false;

/**
 * 送信待ちを、追加した順にサーバーへ送る。
 * - 1 回に 200 件まで。多ければ分けて送る
 * - サーバーが結果を返した変更だけを消す（結果の種類は問わない）。失敗したら消さずに残す
 * - 同時に 2 つ走らないようにする。送っている間に呼ばれたら、終わってからもう 1 回送る
 */
export function flushOutbox(
  fetcher: Fetcher = defaultFetcher,
): Promise<FlushResult> {
  if (running) {
    requestedAgain = true;
    return running;
  }
  running = (async () => {
    let result: FlushResult;
    do {
      requestedAgain = false;
      result = await sendAll(fetcher);
    } while (requestedAgain && result === "done");
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

async function sendAll(fetcher: Fetcher): Promise<FlushResult> {
  for (;;) {
    const batch = await localDb.outbox
      .orderBy("seq")
      .limit(MAX_CHANGES_PER_SYNC)
      .toArray();
    if (batch.length === 0) return "done";

    let body: SyncResponse;
    try {
      const response = await fetcher(SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: batch.map((item) => item.change) }),
      });
      if (!response.ok) return "failed";
      body = (await response.json()) as SyncResponse;
    } catch {
      // 圏外など。次の機会（online イベント・画面を開き直したとき）に送り直す
      return "failed";
    }

    const answered = new Set(body.results.map((result) => result.changeId));
    for (const result of body.results) {
      if (result.status === "rejected") {
        console.warn("同期で受け付けられなかった変更", result);
      }
    }
    const sent = batch.filter((item) => answered.has(item.change.changeId));
    await localDb.transaction(
      "rw",
      localDb.outbox,
      localDb.workouts,
      async () => {
        await localDb.outbox.bulkDelete(sent.map((item) => item.seq));
        await applyAutoFinished(body.autoFinished);
      },
    );
    // 1 件も消せなければ、同じものを送り続けないように止める
    if (sent.length === 0) return "failed";
  }
}

/**
 * サーバーが自動で終了にしたワークアウト（記録中は 1 件まで）を、端末でも終了にする。
 * サーバーと同じく、終了時刻は「残したワークアウトの開始時刻」と自分の開始時刻の遅いほう。
 * サーバーで決まったことなので、送信待ちには積まない。
 */
async function applyAutoFinished(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const finished = new Set(ids);
  const inProgress = (await localDb.workouts.toArray()).filter(
    (workout) => workout.finishedAt === null,
  );
  const kept = inProgress
    .filter((workout) => !finished.has(workout.id))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  for (const workout of inProgress) {
    if (!finished.has(workout.id)) continue;
    const finishedAt =
      kept && kept.startedAt > workout.startedAt
        ? kept.startedAt
        : workout.startedAt;
    await localDb.workouts.update(workout.id, { finishedAt });
  }
}
