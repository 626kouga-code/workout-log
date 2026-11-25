import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./token";

describe("generateToken", () => {
  it("32 バイトの乱数を base64url（43 文字）で返し、毎回違う", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});

describe("hashToken", () => {
  it("SHA-256 を 16 進数 64 文字で返す", () => {
    // echo -n "abc" | sha256sum
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
