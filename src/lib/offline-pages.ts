/**
 * 圏外でも開けるようにする画面（docs/03「PWA」、F-16）。
 * Service Worker（src/app/sw.ts）がページの HTML をこの名前のキャッシュに保存し、
 * ログアウト時（clearLocalData）に消す。
 */
export const OFFLINE_PAGE_CACHE = "workout-pages";

/** 記録画面（S-11）と完了画面（S-12）。クエリ（?id=…）は違っても同じ HTML を使う */
export const OFFLINE_PAGES = ["/workouts/current", "/workouts/summary"];

export const RECORD_PAGE = "/workouts/current";

export function summaryPage(workoutId: string): string {
  return `/workouts/summary?id=${encodeURIComponent(workoutId)}`;
}
