/**
 * 検索用に文字列をそろえる：全角英数字を半角に、大文字を小文字に、ひらがなをカタカナにする。
 * 「べんち」でも「ベンチ」が、「BENCH」でも「bench」が見つかるようにするため。
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .trim();
}

/** 部分一致で探す（大文字小文字・ひらがなとカタカナ・全角半角の違いは無視する） */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeForSearch(query);
  return q === "" || normalizeForSearch(text).includes(q);
}
