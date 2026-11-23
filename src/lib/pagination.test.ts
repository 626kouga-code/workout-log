import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parsePageParams, toPage } from "./pagination";

describe("parsePageParams", () => {
  it("指定がなければ最初のページを 20 件", () => {
    expect(parsePageParams(new URLSearchParams())).toEqual({
      cursor: null,
      limit: PAGE_SIZE,
    });
  });

  it("cursor と limit を受け取る", () => {
    expect(parsePageParams(new URLSearchParams("cursor=abc&limit=5"))).toEqual({
      cursor: "abc",
      limit: 5,
    });
  });

  it("limit は 20 を超えない", () => {
    expect(parsePageParams(new URLSearchParams("limit=1000")).limit).toBe(20);
  });

  it.each(["0", "-1", "1.5", "abc"])("limit=%s は既定の 20 にする", (limit) => {
    expect(parsePageParams(new URLSearchParams({ limit })).limit).toBe(20);
  });
});

describe("toPage", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `id${i}` }));
  const getId = (row: { id: string }) => row.id;

  it("limit 件以下なら最後のページ", () => {
    expect(toPage(rows(3), 3, getId)).toEqual({
      items: rows(3),
      nextCursor: null,
    });
  });

  it("limit + 1 件取れたら続きがあり、limit 件目の ID が次のカーソル", () => {
    const page = toPage(rows(4), 3, getId);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBe("id2");
  });

  it("0 件", () => {
    expect(toPage([], 20, getId)).toEqual({ items: [], nextCursor: null });
  });
});
