import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/page-placeholder";
import { getCurrentUser } from "@/server/auth/session";

/** トップ画面。ログイン中はホームタイムライン、未ログインなら全体タイムライン（/explore）へ */
export default function HomePage() {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/explore");
  return <PagePlaceholder title="ホーム" issue="#23 タイムライン" />;
}
