import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "記録" };

export default function WorkoutsPage() {
  return <PagePlaceholder title="記録" issue="#11 履歴" />;
}
