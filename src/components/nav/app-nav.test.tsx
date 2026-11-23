import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { isActive } from "./nav-items";
import { NavView } from "./nav-view";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NavView", () => {
  it("5 つのタブを表示する", () => {
    render(<NavView pathname="/" />);
    const nav = screen.getByRole("navigation", { name: "メイン" });
    const labels = ["ホーム", "記録", "進捗", "通知", "プロフィール"];
    for (const label of labels) {
      expect(nav).toContainElement(screen.getByRole("link", { name: label }));
    }
  });

  it("開いている画面のタブに aria-current を付ける", () => {
    render(<NavView pathname="/workouts/abc" />);
    expect(screen.getByRole("link", { name: "記録" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "ホーム" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("pathname が分からないときは、どのタブも強調しない", () => {
    render(<NavView pathname={null} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});

describe("isActive", () => {
  it("ホームは / のときだけ", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/workouts")).toBe(false);
  });

  it("配下の画面でもそのタブを強調する", () => {
    expect(isActive("/progress", "/progress/body")).toBe(true);
  });

  it("名前の前方が一致するだけの別の画面は強調しない", () => {
    expect(isActive("/profile", "/profile-settings")).toBe(false);
  });
});
