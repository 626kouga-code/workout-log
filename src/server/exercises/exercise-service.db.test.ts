import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/id";
import { db } from "@/server/db";
import {
  createExercise,
  deleteExercise,
  hideExercise,
  listExercises,
  unhideExercise,
  updateExercise,
} from "./exercise-service";
import { PRESET_EXERCISES } from "./presets";
import { seedPresetExercises } from "./seed";

async function createUser(handle: string): Promise<string> {
  const id = newId();
  await db.user.create({
    data: {
      id,
      email: `${handle}@example.com`,
      passwordHash: "x",
      handle,
      displayName: handle,
    },
  });
  return id;
}

/** 投げられた AppError を取り出す */
async function catchAppError(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

const squatVariant = {
  name: "フロントスクワット",
  bodyPart: "LEGS",
  kind: "WEIGHT",
} as const;

let me: string;
let other: string;

beforeEach(async () => {
  // プリセットは共通の準備（src/test/db-setup.ts）で入っている
  me = await createUser("me");
  other = await createUser("other");
});

describe("プリセット（シード）", () => {
  it("空の DB に 36 種目が付録どおりに入り、もう一度流しても増えない", async () => {
    await db.exercise.deleteMany();
    await seedPresetExercises(db);
    await seedPresetExercises(db);
    const presets = await db.exercise.findMany({
      where: { userId: null },
      orderBy: { id: "asc" },
    });
    expect(presets).toHaveLength(36);
    expect(
      presets.map(({ id, name, bodyPart, kind }) => ({
        id,
        name,
        bodyPart,
        kind,
      })),
    ).toEqual(PRESET_EXERCISES);
  });
});

describe("listExercises", () => {
  it("プリセットと自分の種目を返し、他人の種目は返さない", async () => {
    const mine = await createExercise(me, squatVariant);
    await createExercise(other, { ...squatVariant, name: "他人の種目" });

    const list = await listExercises(me);
    expect(list).toHaveLength(37);
    expect(list.find((e) => e.id === mine.id)).toMatchObject({
      isPreset: false,
      hidden: false,
    });
    expect(list.some((e) => e.name === "他人の種目")).toBe(false);
  });

  it("部位の順に並び、同じ部位では自分の種目はプリセットの後ろ", async () => {
    await createExercise(me, squatVariant);
    const legs = (await listExercises(me))
      .filter((e) => e.bodyPart === "LEGS")
      .map((e) => e.name);
    expect(legs[0]).toBe("スクワット");
    expect(legs.at(-1)).toBe("フロントスクワット");

    const parts = (await listExercises(me)).map((e) => e.bodyPart);
    expect(parts[0]).toBe("CHEST");
    expect(parts.at(-1)).toBe("CARDIO");
  });

  it("非表示の種目は includeHidden のときだけ返す", async () => {
    const mine = await createExercise(me, squatVariant);
    await hideExercise(me, mine.id);

    expect((await listExercises(me)).some((e) => e.id === mine.id)).toBe(false);
    const all = await listExercises(me, { includeHidden: true });
    expect(all.find((e) => e.id === mine.id)?.hidden).toBe(true);
  });
});

describe("createExercise", () => {
  it.each([
    ["自分の種目", "フロントスクワット"],
    ["大文字小文字違い", "Front"],
    ["プリセット", "ベンチプレス"],
  ])("同じ名前（%s）は追加できない", async (_, name) => {
    await createExercise(me, { ...squatVariant, name: "フロントスクワット" });
    await createExercise(me, { ...squatVariant, name: "front" });
    const error = await catchAppError(
      createExercise(me, { ...squatVariant, name }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(error.fieldErrors).toEqual({ name: ["同じ名前の種目があります"] });
  });

  it("非表示にした種目と同じ名前なら、再表示できることを知らせる", async () => {
    const mine = await createExercise(me, squatVariant);
    await hideExercise(me, mine.id);
    const error = await catchAppError(createExercise(me, squatVariant));
    expect(error.fieldErrors?.name?.[0]).toContain("再表示できます");
  });

  it("他人の種目と同じ名前なら追加できる", async () => {
    await createExercise(other, squatVariant);
    await expect(createExercise(me, squatVariant)).resolves.toMatchObject({
      name: "フロントスクワット",
    });
  });
});

describe("updateExercise・hide・unhide・delete", () => {
  it("自分の種目は編集・非表示・再表示・削除できる", async () => {
    const mine = await createExercise(me, squatVariant);

    const updated = await updateExercise(me, mine.id, {
      name: "ゴブレットスクワット",
      bodyPart: "LEGS",
      kind: "WEIGHT",
    });
    expect(updated.name).toBe("ゴブレットスクワット");

    await hideExercise(me, mine.id);
    await unhideExercise(me, mine.id);
    expect((await listExercises(me)).some((e) => e.id === mine.id)).toBe(true);

    await deleteExercise(me, mine.id);
    expect(await db.exercise.count({ where: { id: mine.id } })).toBe(0);
  });

  it("名前を変えずに保存できる（自分自身とは重複にしない）", async () => {
    const mine = await createExercise(me, squatVariant);
    await expect(
      updateExercise(me, mine.id, { ...squatVariant, kind: "BODYWEIGHT" }),
    ).resolves.toMatchObject({ kind: "BODYWEIGHT" });
  });

  it("ほかの種目と同じ名前には変えられない", async () => {
    const mine = await createExercise(me, squatVariant);
    const error = await catchAppError(
      updateExercise(me, mine.id, { ...squatVariant, name: "デッドリフト" }),
    );
    expect(error.code).toBe("CONFLICT");
  });

  describe("他人の種目・プリセットは、どの操作も NOT_FOUND（存在を知らせない）", () => {
    const presetId = PRESET_EXERCISES[0].id;
    const operations = {
      編集: (userId: string, id: string) =>
        updateExercise(userId, id, { ...squatVariant, name: "書き換え" }),
      非表示: hideExercise,
      再表示: unhideExercise,
      削除: deleteExercise,
    };

    for (const [label, operation] of Object.entries(operations)) {
      it(`${label}：他人の種目`, async () => {
        const others = await createExercise(other, squatVariant);
        const error = await catchAppError(operation(me, others.id));
        expect(error.code).toBe("NOT_FOUND");
        // 他人の種目は変わっていない
        expect(
          await db.exercise.findUniqueOrThrow({ where: { id: others.id } }),
        ).toMatchObject({ name: "フロントスクワット", hiddenAt: null });
      });

      it(`${label}：プリセット`, async () => {
        const error = await catchAppError(operation(me, presetId));
        expect(error.code).toBe("NOT_FOUND");
        expect(
          await db.exercise.findUniqueOrThrow({ where: { id: presetId } }),
        ).toMatchObject({ name: "ベンチプレス", hiddenAt: null });
      });
    }
  });
});
