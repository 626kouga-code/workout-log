import Link from "next/link";
import { isActive, NAV_ITEMS } from "./nav-items";

/**
 * ナビゲーションの見た目。
 * スマホ（md 未満）は画面下部のタブバー、PC（md 以上）は左側の縦ナビとして表示する。
 * pathname が null のときは、どのタブも強調しない（読み込み中の表示に使う）。
 */
export function NavView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:top-0 md:left-0 md:h-full md:w-56 md:border-t-0 md:border-r md:pb-0"
    >
      <p className="hidden px-6 py-6 text-lg font-bold md:block">Workout Log</p>
      <ul className="flex md:flex-col md:gap-1 md:px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm ${
                  active
                    ? "font-bold text-blue-600 md:bg-blue-50"
                    : "text-neutral-500 hover:text-neutral-900 md:hover:bg-neutral-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
