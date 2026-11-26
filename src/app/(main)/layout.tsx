import { Suspense, type ReactNode } from "react";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { AppNav } from "@/components/nav/app-nav";
import { NavView } from "@/components/nav/nav-view";
import { ServiceWorker } from "@/components/service-worker";
import { RecordingBar } from "@/components/workouts/recording-bar";

/** ナビゲーション付きの画面の枠 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* 現在の URL は、表示する画面によってはリクエスト時まで分からないため、
          Suspense で囲み、分かるまではタブを強調しないナビを出しておく */}
      <Suspense fallback={<NavView pathname={null} />}>
        <AppNav />
      </Suspense>
      {/* スマホはタブバーの高さ分を下に、PC は左ナビの幅分を左に空ける */}
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
        {/* ログイン中かを調べるまでは何も出さない */}
        <Suspense fallback={null}>
          <VerifyEmailBanner />
        </Suspense>
        {children}
        {/* 記録中のワークアウトがあれば、タブの上に「記録中」のバーを出す。
            どの画面かで出し分けるので、URL が分かるまで待つ */}
        <Suspense fallback={null}>
          <RecordingBar />
        </Suspense>
      </div>
      <ServiceWorker />
    </>
  );
}
