import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "プロフィール" };

export default function ProfilePage() {
  return <PagePlaceholder title="プロフィール" issue="#25 プロフィール" />;
}
