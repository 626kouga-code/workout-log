import { Suspense, type ReactNode } from "react";
import { requireUser } from "@/server/auth/session";

/**
 * ログインが必要な画面の枠。ログインしていなければログイン画面へ移る。
 * （src/proxy.ts でも Cookie の有無で先に振り分けているが、本当の確認はここで行う）
 * Cookie を読むため、cacheComponents の決まりで <Suspense> の内側で確かめる。
 */
export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="sr-only">読み込み中</p>}>
      <RequireLogin>{children}</RequireLogin>
    </Suspense>
  );
}

async function RequireLogin({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
