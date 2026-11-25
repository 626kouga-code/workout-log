import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Workout Log", template: "%s | Workout Log" },
  description: "筋トレの記録と共有",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iPhone の画面下端（ホームバー）まで描画し、タブバー側で余白を取る
  viewportFit: "cover",
};

/**
 * すべての画面の外枠。ナビゲーションは画面のグループごとのレイアウトで付ける。
 * - (main)：ナビ付きの画面（ホーム・記録など）
 * - (plain)：ナビなしの画面（ログイン・新規登録・規約）
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
