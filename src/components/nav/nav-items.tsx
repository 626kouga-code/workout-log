import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

// アイコンは外部ライブラリを使わず、インラインの SVG で描く（線のアイコン、24px）
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 画面のタブ（docs/04_screens.md）。並び順がそのまま表示順になる */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    icon: (
      <Icon>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </Icon>
    ),
  },
  {
    href: "/workouts",
    label: "記録",
    icon: (
      <Icon>
        <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />
      </Icon>
    ),
  },
  {
    href: "/progress",
    label: "進捗",
    icon: (
      <Icon>
        <path d="M3 20h18M6 16v-4M11 16V8M16 16v-6M21 4l-5 5-4-3-6 6" />
      </Icon>
    ),
  },
  {
    href: "/notifications",
    label: "通知",
    icon: (
      <Icon>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </Icon>
    ),
  },
  {
    href: "/profile",
    label: "プロフィール",
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </Icon>
    ),
  },
];

/** pathname がそのタブの中にあるか。ホーム（/）は完全一致だけ */
export function isActive(href: string, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
