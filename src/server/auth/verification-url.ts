/** 確認リンクの URL（APP_URL はアプリの公開 URL。ローカルは http://localhost:3000） */
export function buildVerificationUrl(
  token: string,
  appUrl: string | undefined = process.env.APP_URL,
): string {
  if (!appUrl) throw new Error("APP_URL が設定されていません（.env を確認）");
  const url = new URL("/verify-email", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
