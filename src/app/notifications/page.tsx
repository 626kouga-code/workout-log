import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "通知" };

export default function NotificationsPage() {
  return <PagePlaceholder title="通知" issue="#27 通知" />;
}
