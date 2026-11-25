import "server-only";
import { db } from "@/server/db";
import { sendMail } from "@/server/mail";
import { issueVerificationToken } from "./email-verification";
import { buildVerificationUrl } from "./verification-url";

/** 確認リンクを発行して、ユーザーのメールアドレスに送る */
export async function sendVerificationMail(userId: string): Promise<void> {
  const { email, displayName } = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, displayName: true },
  });
  const token = await issueVerificationToken(userId);
  await sendMail({
    to: email,
    subject: "【Workout Log】メールアドレスの確認",
    text: [
      `${displayName} さん`,
      "",
      "Workout Log にご登録いただきありがとうございます。",
      "次のリンクを開き、「メールアドレスを確認する」を押してください。",
      "",
      buildVerificationUrl(token),
      "",
      "リンクの有効期限は 24 時間です。",
      "心当たりがない場合は、このメールを破棄してください。",
    ].join("\n"),
  });
}

/**
 * 送信に失敗したことをログに残す。メールアドレスやトークンは出さない（docs/10_operations.md）。
 * SMTP のエラー文には宛先が含まれることがあるため、エラーの種類（code）だけを出す。
 */
export function logMailFailure(userId: string, error: unknown): void {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : error instanceof Error
        ? error.name
        : "unknown";
  console.error(
    `確認メールの送信に失敗しました（userId=${userId}, code=${code}）`,
  );
}
