import { expect } from "@playwright/test";

/** Mailpit の API（ローカル・CI とも http://localhost:8025。docs/08_testing.md） */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

type SearchResponse = { messages: { ID: string }[] };
type MessageResponse = { Text: string };

/** 宛先が to の、いちばん新しいメールの本文（テキスト）。届くまで待つ */
export async function latestMailText(to: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}"`);
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
        const body = (await res.json()) as SearchResponse;
        id = body.messages[0]?.ID; // 新しい順に並んでいる
        return id;
      },
      { message: `${to} 宛てのメールが届かない`, timeout: 15_000 },
    )
    .toBeTruthy();
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  return ((await res.json()) as MessageResponse).Text;
}

/** 確認メールから、確認リンクの URL を取り出す */
export async function verificationLink(to: string): Promise<string> {
  const text = await latestMailText(to);
  const link = text.match(/https?:\/\/\S+\/verify-email\?token=[\w-]+/)?.[0];
  expect(link, "確認メールにリンクがない").toBeDefined();
  return link!;
}
