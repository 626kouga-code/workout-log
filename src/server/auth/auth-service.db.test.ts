import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { db } from "@/server/db";
import { LOGIN_FAILED, logIn, signUp } from "./auth-service";

const input: SignUpInput = {
  email: "taro@example.com",
  password: "password123",
  handle: "taro",
  displayName: "たろう",
  agreeToTerms: true,
};

/** 画面・Server Action と同じく、スキーマを通してから登録する */
const register = (overrides: Partial<SignUpInput> = {}) =>
  signUp(signUpSchema.parse({ ...input, ...overrides }));

/** 投げられた AppError を取り出す */
async function catchAppError(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe("signUp", () => {
  it("ユーザーを作り、パスワードはハッシュにして保存する", async () => {
    const { userId } = await register();

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user).toMatchObject({
      email: "taro@example.com",
      handle: "taro",
      displayName: "たろう",
      bio: "",
      emailVerifiedAt: null,
      keepScreenAwake: true,
    });
    expect(user.passwordHash).not.toBe("password123");
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/); // bcrypt、コスト 12
  });

  it("同じメールアドレスは大文字小文字が違っても登録できない", async () => {
    await register();
    const error = await catchAppError(
      register({ email: "TARO@example.com", handle: "jiro" }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(error.fieldErrors).toEqual({
      email: ["このメールアドレスはすでに登録されています"],
    });
  });

  it("同じユーザーIDは大文字小文字が違っても登録できない", async () => {
    await register();
    const error = await catchAppError(
      register({ email: "jiro@example.com", handle: "TARO" }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(error.fieldErrors).toEqual({
      handle: ["このユーザーIDはすでに使われています"],
    });
  });

  it("メールアドレスとユーザーIDの両方が重複していれば、両方を知らせる", async () => {
    await register();
    const error = await catchAppError(register());
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual([
      "email",
      "handle",
    ]);
  });
});

describe("logIn", () => {
  it("メールアドレスとパスワードが合えばユーザーの ID を返す", async () => {
    const { userId } = await register();
    await expect(
      logIn({ email: "taro@example.com", password: "password123" }),
    ).resolves.toEqual({ userId });
  });

  it("パスワードが違うときと、登録されていないメールアドレスのときは、同じエラーにする", async () => {
    await register();
    const wrongPassword = await catchAppError(
      logIn({ email: "taro@example.com", password: "wrong-password" }),
    );
    const unknownEmail = await catchAppError(
      logIn({ email: "nobody@example.com", password: "password123" }),
    );
    for (const error of [wrongPassword, unknownEmail]) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe(LOGIN_FAILED);
    }
  });
});
