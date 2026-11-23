"use client";

import { usePathname } from "next/navigation";
import { NavView } from "./nav-view";

/** 現在の URL を読んで、いま開いているタブを強調するナビゲーション */
export function AppNav() {
  return <NavView pathname={usePathname()} />;
}
