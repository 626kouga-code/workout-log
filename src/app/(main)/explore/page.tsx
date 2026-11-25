import type { Metadata } from "next";
import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "みんなの投稿" };

/** 全体タイムライン（S-01）。未ログインのときのトップ画面 */
export default function ExplorePage() {
  return (
    <>
      <PagePlaceholder title="みんなの投稿" issue="#23 タイムライン" />
      <p className="mx-auto flex max-w-2xl gap-4 px-4 text-sm">
        <Link href="/login" className="text-blue-600 underline">
          ログイン
        </Link>
        <Link href="/signup" className="text-blue-600 underline">
          新規登録
        </Link>
      </p>
    </>
  );
}
