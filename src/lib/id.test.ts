import { describe, expect, it } from "vitest";
import { isId, newId } from "./id";

describe("newId", () => {
  it("UUIDv7 の形式（バージョンを表す 15 文字目が 7）", () => {
    const id = newId();
    expect(isId(id)).toBe(true);
    expect(id[14]).toBe("7");
  });

  it("作った順に、文字列として並ぶ", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    expect([...ids].sort()).toEqual(ids);
  });
});

describe("isId", () => {
  it.each([
    "",
    "abc",
    "0190a6b2-7c3d-7e4f-8a9b-0c1d2e3f4a5",
    "0190A6B2-7C3D-7E4F-8A9B-0C1D2E3F4A5B",
  ])("%s は ID として扱わない", (value) => {
    expect(isId(value)).toBe(false);
  });
});
