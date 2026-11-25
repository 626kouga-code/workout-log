import { getCurrentUser } from "@/server/auth/session";
import { errorResponse, errorResponseFrom } from "@/server/http";
import { getOfflineData } from "@/server/workouts/offline-data";

/**
 * 記録画面を圏外でも使うために端末へ保存するデータ（本人のみ。docs/06_api.md）：
 * 種目一覧、種目ごとの前回の記録、メニュー（#13）、自己ベストの現在値（#16）
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("UNAUTHORIZED");
  try {
    return Response.json(await getOfflineData(user.id));
  } catch (error) {
    return errorResponseFrom(error);
  }
}
