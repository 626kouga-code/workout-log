"use client";

import { SerwistProvider } from "@serwist/turbopack/react";

/**
 * Service Worker（src/app/sw.ts）を登録する。
 * 開発中は古いファイルがキャッシュに残って紛らわしいため、本番ビルドのときだけ登録する。
 */
export function ServiceWorker() {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV !== "production"}
      // ページ移動のたびに保存したり、通信が戻ったときに再読み込みしたりはしない
      // （保存する画面は sw.ts で決めている。再読み込みすると入力中の値が消える）
      cacheOnNavigation={false}
      reloadOnOnline={false}
    />
  );
}
