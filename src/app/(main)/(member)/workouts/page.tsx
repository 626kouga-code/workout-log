import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PagePlaceholder } from "@/components/page-placeholder";
import { requireUser } from "@/server/auth/session";
import { listExercises } from "@/server/exercises/exercise-service";
import { PickerTrial } from "./picker-trial";

export const metadata: Metadata = { title: "記録" };

export default function WorkoutsPage() {
  return (
    <>
      <PagePlaceholder title="記録" issue="#11 履歴" />
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4">
        <Link href="/exercises" className="text-sm text-blue-600 underline">
          種目の管理
        </Link>
        <Suspense>
          <PickerTrialLoader />
        </Suspense>
      </div>
    </>
  );
}

/** 種目選択（S-13）の動作確認用。#9 で記録画面に置き換える */
async function PickerTrialLoader() {
  const user = await requireUser();
  return <PickerTrial exercises={await listExercises(user.id)} />;
}
