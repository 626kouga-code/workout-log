import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("トップ画面", () => {
  it("サービス名を表示する", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Workout Log" }),
    ).toBeInTheDocument();
  });
});
