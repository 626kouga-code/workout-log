import { describe, expect, it } from "vitest";
import { logInSchema, signUpSchema, type SignUpInput } from "./auth";

const valid: SignUpInput = {
  email: "taro@example.com",
  password: "password",
  handle: "taro_01",
  displayName: "たろう",
  agreeToTerms: true,
};

/** 1 項目だけ変えて検証し、その項目のエラーメッセージ（なければ undefined）を返す */
function errorOf<K extends keyof SignUpInput>(key: K, value: SignUpInput[K]) {
  const result = signUpSchema.safeParse({ ...valid, [key]: value });
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === key)?.message;
}

describe("signUpSchema", () => {
  it("正しい入力を受け付ける", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  describe("メールアドレス", () => {
    it("前後の空白を除き、小文字にそろえる", () => {
      const result = signUpSchema.parse({
        ...valid,
        email: "  Taro@Example.COM ",
      });
      expect(result.email).toBe("taro@example.com");
    });

    it.each(["", "taro", "taro@", "@example.com", "taro example@a.com"])(
      "形式が正しくないもの（%j）は受け付けない",
      (email) => {
        expect(errorOf("email", email)).toBeDefined();
      },
    );

    it("254 文字までは受け付け、255 文字は受け付けない", () => {
      const at = (length: number) =>
        `${"a".repeat(length - "@example.com".length)}@example.com`;
      expect(errorOf("email", at(254))).toBeUndefined();
      expect(errorOf("email", at(255))).toBe("メールアドレスが長すぎます");
    });
  });

  describe("パスワード", () => {
    it("7 文字は受け付けず、8 文字は受け付ける", () => {
      expect(errorOf("password", "a".repeat(7))).toBe(
        "パスワードは 8 文字以上で入力してください",
      );
      expect(errorOf("password", "a".repeat(8))).toBeUndefined();
    });

    it("半角 72 文字は受け付け、73 文字は受け付けない（bcrypt の上限）", () => {
      expect(errorOf("password", "a".repeat(72))).toBeUndefined();
      expect(errorOf("password", "a".repeat(73))).toBe(
        "パスワードは半角 72 文字以内で入力してください",
      );
    });

    it("全角は 1 文字 3 バイトとして数える（24 文字まで）", () => {
      expect(errorOf("password", "あ".repeat(24))).toBeUndefined();
      expect(errorOf("password", "あ".repeat(25))).toBeDefined();
    });
  });

  describe("ユーザーID", () => {
    it.each(["abc", "ABC_123", "a".repeat(15), "___"])(
      "%j を受け付ける",
      (handle) => {
        expect(errorOf("handle", handle)).toBeUndefined();
      },
    );

    it.each([
      ["2 文字", "ab"],
      ["16 文字", "a".repeat(16)],
      ["記号", "taro-01"],
      ["ドット", "taro.01"],
      ["空白", "taro 01"],
      ["日本語", "たろう"],
      ["全角英数字", "ｔａｒｏ"],
    ])("%s（%j）は受け付けない", (_, handle) => {
      expect(errorOf("handle", handle)).toBe(
        "ユーザーIDは半角英数字と _ で 3〜15 文字にしてください",
      );
    });
  });

  describe("表示名", () => {
    it("50 文字は受け付け、51 文字は受け付けない", () => {
      expect(errorOf("displayName", "あ".repeat(50))).toBeUndefined();
      expect(errorOf("displayName", "あ".repeat(51))).toBe(
        "表示名は 50 文字以内で入力してください",
      );
    });

    it("空白だけは受け付けない", () => {
      expect(errorOf("displayName", "   ")).toBe("表示名を入力してください");
    });

    it("前後の空白を除く", () => {
      expect(
        signUpSchema.parse({ ...valid, displayName: " たろう " }).displayName,
      ).toBe("たろう");
    });
  });

  it("規約に同意していないと受け付けない", () => {
    expect(errorOf("agreeToTerms", false)).toBe(
      "利用規約とプライバシーポリシーへの同意が必要です",
    );
  });
});

describe("logInSchema", () => {
  it("メールアドレスを小文字にそろえる", () => {
    expect(
      logInSchema.parse({ email: "Taro@Example.com", password: "x" }).email,
    ).toBe("taro@example.com");
  });

  it("パスワードが空なら受け付けない", () => {
    expect(
      logInSchema.safeParse({ email: "taro@example.com", password: "" })
        .success,
    ).toBe(false);
  });
});
