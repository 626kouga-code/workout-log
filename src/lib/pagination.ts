/**
 * カーソル方式のページング（docs/06_api.md「共通の方針」）。
 * `?cursor=<最後のid>&limit=20` で受け取り、`{ items, nextCursor }` で返す。
 */
export const PAGE_SIZE = 20;

export type PageParams = {
  /** この ID より後（古いもの）から取る。最初のページは null */
  cursor: string | null;
  limit: number;
};

export type Page<T> = {
  items: T[];
  /** 続きがあるときの次のカーソル。最後のページなら null */
  nextCursor: string | null;
};

/** URL のクエリからページングの条件を取り出す。limit は 1〜20 に収める */
export function parsePageParams(searchParams: URLSearchParams): PageParams {
  const cursor = searchParams.get("cursor") || null;
  const raw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(raw) && raw > 0 ? Math.min(raw, PAGE_SIZE) : PAGE_SIZE;
  return { cursor, limit };
}

/**
 * DB から limit + 1 件取った結果を 1 ページにする。
 * limit 件より多く取れたら続きがあるので、limit 件目の ID を次のカーソルにする。
 */
export function toPage<T>(
  rows: T[],
  limit: number,
  getId: (row: T) => string,
): Page<T> {
  if (rows.length <= limit) {
    return { items: rows, nextCursor: null };
  }
  const items = rows.slice(0, limit);
  return { items, nextCursor: getId(items[items.length - 1]) };
}
