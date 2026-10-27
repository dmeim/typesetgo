import { existsSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Changelog from "@/pages/Changelog";
import { CHANGELOG, formatChangelogDay, groupChangelogByDay, type ChangelogEntry } from "@/lib/changelog";

vi.mock("@/components/layout/Header", () => ({ default: () => <header aria-label="Site header" /> }));
vi.mock("@/components/changelog/LiveDemo", () => ({ LiveDemo: ({ demo }: { demo: string }) => <p>Demo: {demo}</p> }));
afterEach(cleanup);

// jsdom has no IntersectionObserver; the cards' scroll-in fade only needs it to exist.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

const entry = (id: string, date: string, kind: ChangelogEntry["kind"] = "new"): ChangelogEntry => ({
  id, date, kind, title: id, status: "live", area: "Home", summary: "", highlights: [],
});

describe("changelog data", () => {
  it("groups entries by day, newest day first, keeping each day's order", () => {
    const days = groupChangelogByDay([entry("a", "2026-10-26"), entry("b", "2026-10-27"), entry("c", "2026-10-26")]);
    expect(days.map((day) => [day.date, day.entries.map((item) => item.id)])).toEqual([
      ["2026-10-27", ["b"]],
      ["2026-10-26", ["a", "c"]],
    ]);
  });

  it("formats a day the same in every time zone", () => {
    expect(formatChangelogDay("2026-10-27")).toBe("Tuesday, October 27, 2026");
  });

  it("keeps ids unique, dates valid and screenshots under public/changelog", () => {
    expect(new Set(CHANGELOG.map((item) => item.id)).size).toBe(CHANGELOG.length);
    for (const item of CHANGELOG) {
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.highlights.length).toBeGreaterThan(0);
      for (const shot of item.shots ?? []) {
        expect(shot.src).toMatch(/^\/changelog\/[a-z0-9-]+\.webp$/);
        expect(shot.alt.length).toBeGreaterThan(10);
      }
    }
  });

  it("has a screenshot file for every shot it lists", () => {
    const missing = CHANGELOG.flatMap((item) => item.shots ?? []).filter((shot) => !existsSync(path.join("public", shot.src)));
    expect(missing.map((shot) => shot.src)).toEqual([]);
  });
});

describe("changelog page", () => {
  function renderPage() {
    return render(<MemoryRouter><Changelog /></MemoryRouter>);
  }

  it("lists every change under its day with the site header", () => {
    renderPage();
    expect(screen.getByRole("banner", { name: "Site header" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "What's new" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(CHANGELOG.length);
    expect(screen.getByRole("heading", { level: 2, name: /Tuesday, October 27, 2026/ })).toBeInTheDocument();
  });

  it("filters by kind of change", () => {
    renderPage();
    const improved = CHANGELOG.filter((item) => item.kind === "improved").length;
    const filters = screen.getByRole("group", { name: "Show changes" });
    fireEvent.click(within(filters).getByRole("button", { name: /^Improved/ }));
    expect(within(filters).getByRole("button", { name: /^Improved/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(improved);
  });

  it("opens and closes a live demo inside the card", () => {
    renderPage();
    const card = document.getElementById("keyboard-designs") as HTMLElement;
    const tryIt = within(card).getByRole("button", { name: "Try it here" });
    fireEvent.click(tryIt);
    expect(within(card).getByRole("button", { name: "Close the demo" })).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getByText("Demo: keyboard")).toBeInTheDocument();
  });

  it("opens a screenshot full size", () => {
    renderPage();
    const card = document.getElementById("one-screen-results") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /^View larger:/ }));
    expect(screen.getByRole("dialog", { name: "Results that fit on one screen" })).toBeInTheDocument();
  });
});
