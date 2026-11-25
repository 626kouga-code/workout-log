import Link from "next/link";
import type { ReactNode } from "react";

/** ナビゲーションなしの画面（ログイン・新規登録・規約）の枠 */
export default function PlainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-lg font-bold">
        Workout Log
      </Link>
      {children}
    </div>
  );
}
