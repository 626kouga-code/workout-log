import "@testing-library/jest-dom/vitest";
// jsdom には IndexedDB がないため、メモリ上で動く代わりのものを入れる（端末のデータ #9 のテスト用）
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
