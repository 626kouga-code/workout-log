/**
 * 同期の競合の解決（docs/06_api.md「記録中のデータの同期」）。DB を使わない判定だけをここに置く。
 *
 * 同じもの（ワークアウト・種目・セット）を複数の端末で変えた場合は、
 * 端末で変更した時刻（clientUpdatedAt）が新しいほうを採用する。削除されたものへの更新は無視する。
 */

export type Resolution =
  /** まだないので作る */
  | "create"
  /** 今あるものより新しいので書き換える */
  | "update"
  /** 今あるものより新しいので消す */
  | "delete"
  /** まだないが、削除したことを覚えておく（ほかの端末から遅れて届く作成を防ぐ） */
  | "tombstone"
  /** 古い・削除済みなので何もしない */
  | "ignore";

export function resolveConflict({
  op,
  incomingAt,
  existingAt,
  deleted,
}: {
  op: "upsert" | "delete";
  /** 届いた変更の、端末で変更した時刻 */
  incomingAt: Date;
  /** 今ある行の、端末で変更した時刻（行がなければ null） */
  existingAt: Date | null;
  /** 削除の記録があるか */
  deleted: boolean;
}): Resolution {
  if (deleted) return "ignore";
  if (existingAt === null) return op === "upsert" ? "create" : "tombstone";
  // 同じ時刻なら、先に届いたほうを残す（何度送り直しても結果が変わらないように）
  if (incomingAt.getTime() <= existingAt.getTime()) return "ignore";
  return op === "upsert" ? "update" : "delete";
}

/**
 * 記録中のワークアウトは 1 件まで。2 件以上あれば、開始がいちばん新しいものだけを記録中に残し、
 * ほかは「新しいほうを開始した時刻」で終了にする（開始より前にはしない）。
 * 開始時刻が同じなら ID（作成順の UUIDv7）が大きいほうを残す。
 */
export function pickWorkoutsToFinish(
  active: { id: string; startedAt: Date }[],
): { id: string; finishedAt: Date }[] {
  if (active.length <= 1) return [];
  const sorted = [...active].sort(
    (a, b) =>
      b.startedAt.getTime() - a.startedAt.getTime() ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
  const [keep, ...rest] = sorted;
  return rest.map((workout) => ({
    id: workout.id,
    finishedAt: new Date(
      Math.max(keep.startedAt.getTime(), workout.startedAt.getTime()),
    ),
  }));
}
