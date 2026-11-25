import { describe, expect, it } from "vitest";
import { buildVerificationUrl } from "./verification-url";

describe("buildVerificationUrl", () => {
  it("アプリの URL に /verify-email?token= を付ける", () => {
    expect(buildVerificationUrl("abc_-123", "http://localhost:3000")).toBe(
      "http://localhost:3000/verify-email?token=abc_-123",
    );
  });

  it("APP_URL の末尾に / があっても二重にしない", () => {
    expect(buildVerificationUrl("t", "https://example.com/")).toBe(
      "https://example.com/verify-email?token=t",
    );
  });

  it("APP_URL がなければエラーにする", () => {
    expect(() => buildVerificationUrl("t", "")).toThrow("APP_URL");
  });
});
