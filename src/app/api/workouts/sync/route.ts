import { syncRequestSchema } from "@/lib/validation/workout-sync";
import { getCurrentUser } from "@/server/auth/session";
import { errorResponse, errorResponseFrom, isSameOrigin } from "@/server/http";
import { applyChanges } from "@/server/workouts/sync-service";

/**
 * 記録中の変更をまとめて受け取り、反映する（F-16、docs/06_api.md「記録中のデータの同期」）。
 * 本文：{ changes: [{ changeId, entity, op, id, data?, clientUpdatedAt }] }（200 件まで）
 * 応答：変更ごとの結果、自動で終了にしたワークアウト、更新した自己ベスト
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("FORBIDDEN");
  const user = await getCurrentUser();
  if (!user) return errorResponse("UNAUTHORIZED");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "JSON の形式が正しくありません");
  }
  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? undefined,
    );
  }

  try {
    return Response.json(await applyChanges(user.id, parsed.data.changes));
  } catch (error) {
    return errorResponseFrom(error);
  }
}
