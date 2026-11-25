import { describe, expect, it } from "vitest";
import { pickWorkoutsToFinish, resolveConflict } from "./conflict";

const t = (minutes: number) => new Date(Date.UTC(2026, 10, 25, 10, minutes));

describe("resolveConflict", () => {
  it.each([
    // [説明, 操作, 届いた時刻, 今ある行の時刻, 削除済みか, 結果]
    ["まだない行の upsert は作る", "upsert", t(5), null, false, "create"],
    ["新しい upsert は書き換える", "upsert", t(5), t(1), false, "update"],
    ["古い upsert は無視する", "upsert", t(1), t(5), false, "ignore"],
    [
      "同じ時刻の upsert は無視する（先に届いたほうを残す）",
      "upsert",
      t(5),
      t(5),
      false,
      "ignore",
    ],
    [
      "削除済みへの upsert は無視する（復活させない）",
      "upsert",
      t(9),
      null,
      true,
      "ignore",
    ],
    ["新しい delete は消す", "delete", t(5), t(1), false, "delete"],
    [
      "古い delete は無視する（ほかの端末の新しい変更を残す）",
      "delete",
      t(1),
      t(5),
      false,
      "ignore",
    ],
    [
      "まだない行の delete は、削除したことだけ覚える",
      "delete",
      t(5),
      null,
      false,
      "tombstone",
    ],
    ["削除済みへの delete は無視する", "delete", t(5), null, true, "ignore"],
  ] as const)("%s", (_, op, incomingAt, existingAt, deleted, expected) => {
    expect(resolveConflict({ op, incomingAt, existingAt, deleted })).toBe(
      expected,
    );
  });
});

describe("pickWorkoutsToFinish", () => {
  it("記録中が 1 件以下なら何もしない", () => {
    expect(pickWorkoutsToFinish([])).toEqual([]);
    expect(pickWorkoutsToFinish([{ id: "a", startedAt: t(0) }])).toEqual([]);
  });

  it("開始がいちばん新しいものを残し、ほかは新しいほうの開始時刻で終了にする", () => {
    expect(
      pickWorkoutsToFinish([
        { id: "old", startedAt: t(0) },
        { id: "new", startedAt: t(30) },
        { id: "mid", startedAt: t(10) },
      ]),
    ).toEqual([
      { id: "mid", finishedAt: t(30) },
      { id: "old", finishedAt: t(30) },
    ]);
  });

  it("開始時刻が同じなら ID が大きい（あとに作った）ほうを残す", () => {
    expect(
      pickWorkoutsToFinish([
        { id: "b", startedAt: t(0) },
        { id: "a", startedAt: t(0) },
      ]),
    ).toEqual([{ id: "a", finishedAt: t(0) }]);
  });
});
