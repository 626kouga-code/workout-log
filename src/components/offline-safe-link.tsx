"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * 圏外でも開ける画面（記録画面など）へのリンク。
 * Next.js の画面内の移動はサーバーからデータを取るので、圏外では進めない。
 * 圏外のときは通常のページ移動にして、Service Worker が保存した画面を出させる。
 */
export function OfflineSafeLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !navigator.onLine) {
          event.preventDefault();
          window.location.assign(href);
        }
      }}
      {...props}
    />
  );
}

/** 圏外でも開ける画面へ、コードから移る（OfflineSafeLink と同じ考え方） */
export function goTo(push: (href: string) => void, href: string): void {
  if (navigator.onLine) push(href);
  else window.location.assign(href);
}
