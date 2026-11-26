import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Service Worker（src/app/sw.ts）をまとめて /serwist/sw.js として配る。
 * ビルド時に静的ファイルの一覧を埋め込むので、事前キャッシュの対象が自動で決まる。
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    // Windows でも動く、ネイティブ版の esbuild でまとめる
    useNativeEsbuild: true,
  });
