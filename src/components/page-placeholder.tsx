/** まだ作っていない画面の仮表示。各機能の Issue で中身に置き換える */
export function PagePlaceholder({
  title,
  issue,
}: {
  title: string;
  issue: string;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-4 text-sm text-neutral-500">
        この画面は準備中です（{issue}）。
      </p>
    </main>
  );
}
