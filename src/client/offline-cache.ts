import { OFFLINE_PAGE_CACHE, RECORD_PAGE } from "@/lib/offline-pages";

const hasCacheApi = () => typeof caches !== "undefined";

/**
 * 記録画面の HTML を先に取って保存しておく（記録トップを開いたときに呼ぶ）。
 * 一度も記録画面を開かないうちに圏外になっても、記録画面を開けるようにするため。
 * 保存の形は Service Worker（src/app/sw.ts）と同じ（キーはクエリなしの URL）。
 */
export async function warmOfflinePages(): Promise<void> {
  if (!hasCacheApi() || process.env.NODE_ENV !== "production") return;
  try {
    const response = await fetch(RECORD_PAGE);
    // ログイン画面へ飛ばされたときなどは保存しない
    if (!response.ok || response.redirected) return;
    const cache = await caches.open(OFFLINE_PAGE_CACHE);
    await cache.put(new URL(RECORD_PAGE, location.origin).href, response);
  } catch {
    // 圏外など。保存済みのものがあればそれを使う
  }
}

/** 保存した画面を消す（ログアウト時） */
export async function clearOfflinePages(): Promise<void> {
  if (hasCacheApi()) await caches.delete(OFFLINE_PAGE_CACHE);
}
