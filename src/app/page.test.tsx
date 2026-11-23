import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("ホーム", () => {
  it("見出しを表示する", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
  });
});
