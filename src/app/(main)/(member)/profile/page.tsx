import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";
import { logOutAction } from "@/server/auth/actions";

export const metadata: Metadata = { title: "プロフィール" };

export default function ProfilePage() {
  return (
    <>
      <PagePlaceholder title="プロフィール" issue="#25 プロフィール" />
      {/* 設定画面（#29）ができるまでの仮の置き場所 */}
      <form action={logOutAction} className="mx-auto max-w-2xl px-4">
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
        >
          ログアウト
        </button>
      </form>
    </>
  );
}
