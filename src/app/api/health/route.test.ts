import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { $queryRaw: queryRaw } }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("DB に接続できれば 200 を返す", async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("DB に接続できなければ 503 を返す", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error" });
  });
});
