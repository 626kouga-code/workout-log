import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * メール送信（Nodemailer）。ローカル・CI は Mailpit（受信箱は http://localhost:8025）、
 * 本番は AWS SES の SMTP に送る（docs/07_tech-stack.md）。
 */
let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST が設定されていません（.env を確認）");
  const user = process.env.SMTP_USER;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    // true なら最初から TLS で接続する（SES の 465 番ポートなど）
    secure: process.env.SMTP_SECURE === "true",
    // Mailpit は認証なし。SES はユーザー名とパスワードで認証する
    auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return transporter;
}

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM が設定されていません（.env を確認）");
  await getTransporter().sendMail({ from, ...message });
}
