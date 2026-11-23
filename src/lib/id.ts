import { v7 } from "uuid";

/**
 * 新しい ID（UUIDv7、ハイフン付き 36 文字。docs/05_data-model.md）。
 * 作成した順に並ぶので、カーソル方式のページングの並び順にそのまま使える。
 * ブラウザでも動くため、圏外で記録するときの端末側の ID 生成（F-16）にも使う。
 */
export function newId(): string {
  return v7();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** ID の形式（小文字のハイフン付き UUID）か */
export function isId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
