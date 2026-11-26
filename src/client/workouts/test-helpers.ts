import type { ExerciseItem } from "@/lib/exercise";
import type { SyncResponse } from "@/lib/validation/workout-sync";
import { localDb } from "./local-db";
import type { Fetcher } from "./outbox";

/** テスト用：端末のデータを全部消す */
export async function clearLocalDb(): Promise<void> {
  await Promise.all(localDb.tables.map((table) => table.clear()));
}

export const BENCH: ExerciseItem = {
  id: "0190a000-0000-7000-8000-000000000001",
  name: "ベンチプレス",
  bodyPart: "CHEST",
  kind: "WEIGHT",
  isPreset: true,
  hidden: false,
};

export const PUSH_UP: ExerciseItem = {
  id: "0190a000-0000-7000-8000-000000000002",
  name: "腕立て伏せ",
  bodyPart: "CHEST",
  kind: "BODYWEIGHT",
  isPreset: true,
  hidden: false,
};

/** テスト用：送られた変更をすべて applied と答える同期 API */
export function acceptingFetcher(
  extra: Partial<SyncResponse> = {},
): Fetcher & { calls: string[][] } {
  const calls: string[][] = [];
  const fetcher = async (_input: string, init?: RequestInit) => {
    const { changes } = JSON.parse(String(init?.body)) as {
      changes: { changeId: string }[];
    };
    calls.push(changes.map((change) => change.changeId));
    const body: SyncResponse = {
      results: changes.map((change) => ({
        changeId: change.changeId,
        status: "applied",
      })),
      autoFinished: [],
      personalRecords: [],
      ...extra,
    };
    return Response.json(body);
  };
  return Object.assign(fetcher, { calls });
}
