import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppNav } from "@/components/nav/app-nav";
import { NavView } from "@/components/nav/nav-view";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        {/* 現在の URL は、表示する画面によってはリクエスト時まで分からないため、
            Suspense で囲み、分かるまではタブを強調しないナビを出しておく */}
        <Suspense fallback={<NavView pathname={null} />}>
          <AppNav />
        </Suspense>
        {/* スマホはタブバーの高さ分を下に、PC は左ナビの幅分を左に空ける */}
        <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
          {children}
        </div>
      </body>
    </html>
  );
}
