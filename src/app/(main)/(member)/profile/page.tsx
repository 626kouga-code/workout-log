import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "プロフィール" };

export default function ProfilePage() {
  return (
    <>
      <PagePlaceholder title="プロフィール" issue="#25 プロフィール" />
      {/* 設定画面（#29）ができるまでの仮の置き場所 */}
      <div className="mx-auto max-w-2xl px-4">
        <LogoutButton />
      </div>
    </>
  );
}
