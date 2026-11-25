import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/id";
import { db } from "@/server/db";
import {
  assertEmailVerified,
  issueVerificationToken,
  RESEND_INTERVAL_MS,
  VERIFICATION_TTL_MS,
  verifyEmailToken,
} from "./email-verification";
import { hashToken } from "./token";

const T0 = new Date("2026-11-25T00:00:00Z");
const after = (ms: number) => new Date(T0.getTime() + ms);

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

const verifiedAt = async () =>
  (await db.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt;

describe("issueVerificationToken", () => {
  it("DB にはトークンのハッシュだけを保存し、期限は 24 時間後", async () => {
    const token = await issueVerificationToken(userId, T0);
    const [record] = await db.emailVerification.findMany();
    expect(record.tokenHash).toBe(hashToken(token));
    expect(record.expiresAt).toEqual(after(VERIFICATION_TTL_MS));
    expect(record.usedAt).toBeNull();
  });

  it("1 分以内は続けて発行できず、1 分たてば発行できる", async () => {
    await issueVerificationToken(userId, T0);

    const error = await issueVerificationToken(
      userId,
      after(RESEND_INTERVAL_MS - 1),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("TOO_MANY_REQUESTS");

    await expect(
      issueVerificationToken(userId, after(RESEND_INTERVAL_MS)),
    ).resolves.toEqual(expect.any(String));
    expect(await db.emailVerification.count()).toBe(2);
  });
});

describe("verifyEmailToken", () => {
  it("有効なリンクで確認済みになり、同じリンクの 2 回目は使用済み", async () => {
    const token = await issueVerificationToken(userId, T0);

    await expect(verifyEmailToken(token, after(1000))).resolves.toBe(
      "verified",
    );
    expect(await verifiedAt()).toEqual(after(1000));

    await expect(verifyEmailToken(token, after(2000))).resolves.toBe("used");
    // 確認した日時は 1 回目のまま
    expect(await verifiedAt()).toEqual(after(1000));
  });

  it("24 時間ちょうどで期限切れ（その直前までは有効）", async () => {
    const expired = await issueVerificationToken(userId, T0);
    await expect(
      verifyEmailToken(expired, after(VERIFICATION_TTL_MS)),
    ).resolves.toBe("expired");
    expect(await verifiedAt()).toBeNull();

    const valid = await issueVerificationToken(
      userId,
      after(RESEND_INTERVAL_MS),
    );
    await expect(
      verifyEmailToken(
        valid,
        after(RESEND_INTERVAL_MS + VERIFICATION_TTL_MS - 1),
      ),
    ).resolves.toBe("verified");
  });

  it("知らないトークンは無効", async () => {
    await issueVerificationToken(userId, T0);
    await expect(verifyEmailToken("unknown", T0)).resolves.toBe("invalid");
  });

  it("前に送ったリンクも、期限内なら使える", async () => {
    const first = await issueVerificationToken(userId, T0);
    await issueVerificationToken(userId, after(RESEND_INTERVAL_MS));
    await expect(
      verifyEmailToken(first, after(RESEND_INTERVAL_MS + 1)),
    ).resolves.toBe("verified");
  });

  it("同じリンクが同時に 2 回押されても、確認済みにするのは 1 回だけ", async () => {
    const token = await issueVerificationToken(userId, T0);
    const results = await Promise.all([
      verifyEmailToken(token, after(1000)),
      verifyEmailToken(token, after(1000)),
    ]);
    expect(results.sort()).toEqual(["used", "verified"]);
  });
});

describe("assertEmailVerified", () => {
  it("未確認なら EMAIL_NOT_VERIFIED（403）", () => {
    let error: unknown;
    try {
      assertEmailVerified({ emailVerified: false });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("EMAIL_NOT_VERIFIED");
    expect((error as AppError).status).toBe(403);
  });

  it("確認済みなら何もしない", () => {
    expect(() => assertEmailVerified({ emailVerified: true })).not.toThrow();
  });
});
