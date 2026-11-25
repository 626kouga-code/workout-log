import { getCurrentUser } from "@/server/auth/session";
import { ResendVerificationButton } from "./resend-verification-button";

/**
 * メールアドレスが未確認のユーザーに、画面上部で確認を促す帯（F-02、docs/04_screens.md）。
 * Cookie を読むため、<Suspense> の内側に置く。
 */
export async function VerifyEmailBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;
  return (
    <div
      role="region"
      aria-label="メールアドレスの確認"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <p className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          メールアドレスを確認してください。届いたメールのリンクを開くと、投稿やコメントができるようになります。
        </span>
        <ResendVerificationButton />
      </p>
    </div>
  );
}
