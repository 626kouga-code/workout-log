import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const applyChanges = vi.fn();

vi.mock("@/server/auth/session", () => ({ getCurrentUser }));
vi.mock("@/server/workouts/sync-service", () => ({ applyChanges }));

const { POST } = await import("./route");

const CHANGE_ID = "01a21000-8800-7000-8000-000000000000";

function request(
  body: unknown,
  origin: string | null = "http://localhost:3000",
): Request {
  const headers: Record<string, string> = {
    host: "localhost:3000",
    "content-type": "application/json",
  };
  if (origin) headers.origin = origin;
  return new Request("http://localhost:3000/api/workouts/sync", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/workouts/sync", () => {
  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue({ id: "user-1" });
    applyChanges.mockReset().mockResolvedValue({
      results: [{ changeId: CHANGE_ID, status: "applied" }],
      autoFinished: [],
      personalRecords: [],
    });
  });

  it("ログイン中のユーザーの変更として反映し、結果を返す", async () => {
    const changes = [{ changeId: CHANGE_ID, entity: "set" }];
    const res = await POST(request({ changes }));

    expect(res.status).toBe(200);
    expect(applyChanges).toHaveBeenCalledWith("user-1", changes);
    expect((await res.json()).results[0].status).toBe("applied");
  });

  it("別のサイトからのリクエストは 403（CSRF 対策）", async () => {
    const res = await POST(
      request({ changes: [] }, "https://evil.example.com"),
    );
    expect(res.status).toBe(403);
    expect(applyChanges).not.toHaveBeenCalled();
  });

  it("Origin がなければ 403", async () => {
    expect((await POST(request({ changes: [] }, null))).status).toBe(403);
  });

  it("ログインしていなければ 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await POST(request({ changes: [] }));
    expect(res.status).toBe(401);
    expect(applyChanges).not.toHaveBeenCalled();
  });

  it.each([
    ["JSON でない", "not json"],
    ["changes がない", {}],
    ["changeId のない変更がある", { changes: [{ entity: "set" }] }],
    ["201 件ある", { changes: Array(201).fill({ changeId: CHANGE_ID }) }],
  ])("形が不正（%s）なら 400", async (_, body) => {
    const res = await POST(request(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(applyChanges).not.toHaveBeenCalled();
  });
});
