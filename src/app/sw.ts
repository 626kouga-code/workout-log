/// <reference lib="esnext" />
/// <reference lib="webworker" />
import {
  NetworkFirst,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
import { OFFLINE_PAGE_CACHE, OFFLINE_PAGES } from "@/lib/offline-pages";

/**
 * Service Worker（Serwist）。ブラウザの裏で動き、通信を仲立ちする。
 * - 画面の JS・CSS などの静的ファイルは、最初に開いたときにまとめて保存しておく（事前キャッシュ）
 * - 記録画面・完了画面の HTML は、通信できればサーバーから取って保存し、
 *   圏外（または 3 秒応答がない）ときは保存しておいたものを出す（NetworkFirst）
 * - それ以外の画面は今まで通りサーバーへ（圏外時の「オフラインです」表示は #29）
 * src/app/serwist/[path]/route.ts がこのファイルを /serwist/sw.js にまとめて配る。
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** クエリ（?id=…）を外したキー。どの ID でも同じ HTML を使う */
function pageKey(url: string): string {
  const parsed = new URL(url);
  return parsed.origin + parsed.pathname;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.method === "GET" &&
        OFFLINE_PAGES.includes(url.pathname) &&
        // 画面内の移動（router.push）で取る RSC のデータは HTML ではないので、保存しない
        !request.headers.has("RSC") &&
        !url.searchParams.has("_rsc"),
      handler: new NetworkFirst({
        cacheName: OFFLINE_PAGE_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => pageKey(request.url),
            // ログイン画面へ飛ばされたときなどは保存しない
            cacheWillUpdate: async ({ response }) =>
              response.ok && !response.redirected ? response : null,
          },
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
