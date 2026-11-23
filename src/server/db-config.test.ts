import { describe, expect, it } from "vitest";
import { toPoolConfig } from "./db-config";

describe("toPoolConfig", () => {
  it("接続文字列を分解する", () => {
    expect(
      toPoolConfig("mysql://workout:workout@localhost:3306/workout_log"),
    ).toEqual({
      host: "localhost",
      port: 3306,
      user: "workout",
      password: "workout",
      database: "workout_log",
      allowPublicKeyRetrieval: true,
    });
  });

  it("ポートを省略したら 3306 にする", () => {
    expect(toPoolConfig("mysql://u:p@db.example.com/app").port).toBe(3306);
  });

  it("パスワードの記号（URL エンコード済み）を元に戻す", () => {
    expect(toPoolConfig("mysql://u:p%40ss%2Fw@localhost/app").password).toBe(
      "p@ss/w",
    );
  });
});
