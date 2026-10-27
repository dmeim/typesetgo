import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeContext, type ThemeContextValue } from "@/context/ThemeContext";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { APP_VERSION } from "@/lib/app-version";
import Home from "@/pages/Home";

vi.mock("@/components/layout/Header", () => ({ default: () => <header aria-label="Site header" /> }));
// Stands in for the practice area: two buttons report the typing state the way TypingPractice does.
vi.mock("@/components/typing/TypingPractice", () => ({
  default: ({ onTypingStateChange }: { onTypingStateChange?: (typing: boolean) => void }) => (
    <>
      <button type="button" onClick={() => onTypingStateChange?.(true)}>Start typing</button>
      <button type="button" onClick={() => onTypingStateChange?.(false)}>Stop typing</button>
    </>
  ),
}));

afterEach(cleanup);

// The footer reads only the theme name.
const theme = { themeName: "Nord" } as ThemeContextValue;

function view(children: ReactNode, path = "/") {
  return render(
    <ThemeContext.Provider value={theme}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </ThemeContext.Provider>,
  );
}

describe("site footer", () => {
  it("shows the version and theme, and links to the info pages and the changelog", () => {
    view(<SiteFooter />, "/privacy");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(`TypeSetGo v${APP_VERSION}`);
    expect(footer).toHaveTextContent("Theme: Nord");

    const links = within(within(footer).getByRole("navigation", { name: "Footer" })).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["About", "/about"],
      ["Privacy", "/privacy"],
      ["Terms", "/tos"],
      ["What's new", "/changelog"],
    ]);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });

  it("on Home, keeps the legal links until you type, then hides and leaves the tab order until you stop", () => {
    view(<Home />);
    const footer = document.querySelector("footer")!;
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/tos");
    expect(footer).not.toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "Start typing" }));
    expect(footer).toHaveAttribute("inert");
    expect(footer).toHaveAttribute("aria-hidden", "true");
    expect(footer).toHaveClass("invisible", "opacity-0");
    expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
    // Still in the layout, so the practice text above it doesn't move.
    expect(footer).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop typing" }));
    expect(footer).not.toHaveAttribute("inert");
    expect(footer).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("link", { name: "Privacy" })).toBeVisible();
  });
});
