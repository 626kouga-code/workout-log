import { beforeEach, describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { db } from "@/server/db";
import {
  createSessionRecord,
  deleteSessionRecord,
  findSessionUser,
  SESSION_MAX_AGE_SECONDS,
} from "./session-store";
import { hashToken } from "./token";

let userId: string;

beforeEach(async () => {
  userId = newId();
  await db.user.create({
    data: {
      id: userId,
      email: "taro@example.com",
      passwordHash: "x",
      handle: "taro",
      displayName: "たろう",
    },
  });
});

describe("セッション", () => {
  it("DB にはトークンそのものではなくハッシュを保存し、期限は 30 日後", async () => {
    const now = new Date("2026-11-25T00:00:00Z");
    const { token, expiresAt } = await createSessionRecord(userId, now);

    const sessions = await db.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).toBe(hashToken(token));
    expect(sessions[0].tokenHash).not.toBe(token);
    expect(expiresAt.getTime() - now.getTime()).toBe(
      SESSION_MAX_AGE_SECONDS * 1000,
    );
  });

  it("トークンからログイン中のユーザーが分かる", async () => {
    const { token } = await createSessionRecord(userId);
    await expect(findSessionUser(token)).resolves.toEqual({
      id: userId,
      handle: "taro",
      displayName: "たろう",
      emailVerified: false,
    });
  });

  it("知らないトークンでは null", async () => {
    await createSessionRecord(userId);
    await expect(findSessionUser("unknown-token")).resolves.toBeNull();
  });

  it("期限が切れたら null", async () => {
    const now = new Date("2026-11-25T00:00:00Z");
    const { token, expiresAt } = await createSessionRecord(userId, now);
    const justBefore = new Date(expiresAt.getTime() - 1);
    await expect(findSessionUser(token, justBefore)).resolves.not.toBeNull();
    await expect(findSessionUser(token, expiresAt)).resolves.toBeNull();
  });

  it("ログアウトでセッションの行を消し、以後は使えない。ほかの端末のセッションは残る", async () => {
    const { token } = await createSessionRecord(userId);
    const other = await createSessionRecord(userId);

    await deleteSessionRecord(token);

    await expect(findSessionUser(token)).resolves.toBeNull();
    await expect(findSessionUser(other.token)).resolves.not.toBeNull();
    expect(await db.session.count()).toBe(1);
  });

  it("ユーザーを削除すると、そのセッションも消える", async () => {
    await createSessionRecord(userId);
    await db.user.delete({ where: { id: userId } });
    expect(await db.session.count()).toBe(0);
  });
});
