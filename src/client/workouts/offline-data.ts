import type { OfflineData } from "@/server/workouts/offline-data";
import { localDb } from "./local-db";
import type { Fetcher } from "./outbox";

export const OFFLINE_DATA_URL = "/api/workouts/offline-data";

const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

/**
 * 記録に使うデータ（種目・前回の記録）をサーバーから取り直し、端末に保存する。
 * 記録トップ・記録画面を開いたときと、ワークアウトの終了後に呼ぶ。
 * 取れなかったら（圏外など）、端末に残っている前回の分をそのまま使う。
 */
export async function refreshOfflineData(
  fetcher: Fetcher = defaultFetcher,
): Promise<boolean> {
  let data: OfflineData;
  try {
    const response = await fetcher(OFFLINE_DATA_URL);
    if (!response.ok) return false;
    data = (await response.json()) as OfflineData;
  } catch {
    return false;
  }
  await localDb.transaction(
    "rw",
    localDb.exercises,
    localDb.previousRecords,
    async () => {
      await localDb.exercises.clear();
      await localDb.exercises.bulkPut(data.exercises);
      await localDb.previousRecords.clear();
      await localDb.previousRecords.bulkPut(data.previousRecords);
    },
  );
  return true;
}
