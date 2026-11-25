import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "進捗" };

export default function ProgressPage() {
  return (
    <PagePlaceholder title="進捗" issue="#18 自己ベスト一覧と週間サマリー" />
  );
}
