import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserStatsChartModal from "@/components/stats/UserStatsChartModal";
import { profileResultVerification } from "@/components/stats/profile-presentation";

// The Stats tab's lifetime cards open this chart; these cover the recent-sample rules it applies.
const fixture = vi.hoisted(() => ({
  chartData: [] as { value: number; isBest: boolean; isLowest: boolean }[],
}));

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ colors: {
  bg: { surface: "#222" }, text: { primary: "#eee", secondary: "#aaa" },
  border: { subtle: "#444", default: "#555" }, interactive: { secondary: { DEFAULT: "#ddd" } },
  status: { success: { DEFAULT: "#afa" }, error: { DEFAULT: "#faa" } },
} }) }));
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
vi.mock("recharts", () => ({
  LineChart: ({ data, children }: { data: typeof fixture.chartData; children: ReactNode }) => { fixture.chartData = data; return <div>{children}</div>; },
  CartesianGrid: () => null, Line: () => null, XAxis: () => null, YAxis: () => null, Dot: () => null,
}));

type Verification = "valid" | "verified" | "unverified" | "invalid";
interface Result { wpm: number; accuracy: number; duration: number; wordCount: number; verification: Verification; createdAt: number }

const baseResult: Result = {
  wpm: 80, accuracy: 97.5, duration: 30_000, wordCount: 40, verification: "verified",
  createdAt: new Date("2026-09-15T12:00:00Z").getTime(),
};

function openChart(results: Result[], cardType: "bestWpm" | "characters" = "bestWpm", cardValue = "180") {
  return render(<UserStatsChartModal isOpen onClose={() => {}} cardType={cardType} cardValue={cardValue} allResults={results} />);
}

beforeEach(() => { fixture.chartData = []; });
afterEach(cleanup);

describe("stats chart", () => {
  it("charts older responses without verification fields by their saved validity", () => {
    const results = [
      { ...baseResult, verification: undefined, isValid: true },
      { ...baseResult, verification: undefined, isValid: false, createdAt: baseResult.createdAt + 1 },
    ].map((result) => ({ ...result, verification: profileResultVerification(result as never) }));
    openChart(results);
    const chart = screen.getByRole("dialog", { name: "Recent WPM" });
    expect(within(chart).getByText(/Tests shown: 1 of the latest 2 saved/)).toBeInTheDocument();
    expect(fixture.chartData.map((point) => point.value)).toEqual([80]);
  });

  it("keeps the lifetime best separate from the latest 100 sample", () => {
    openChart(Array.from({ length: 100 }, (_, index) => ({
      ...baseResult, wpm: 50 + index, createdAt: baseResult.createdAt - index * 60_000, verification: index === 99 ? "invalid" : "verified",
    })));
    const dialog = screen.getByRole("dialog", { name: "Recent WPM" });
    expect(within(dialog).getByText("Lifetime best WPM: 180")).toBeInTheDocument();
    expect(within(dialog).getByText(/Tests shown: 99 of the latest 100 saved/)).toBeInTheDocument();
    expect(fixture.chartData).toHaveLength(99);
    expect(fixture.chartData.find((point) => point.isBest)?.value).toBe(148);
    expect(fixture.chartData.find((point) => point.isLowest)?.value).toBe(50);
    const highest = within(dialog).getByRole("button", { name: "Highest in sample" });
    expect(highest).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(highest);
    expect(highest).toHaveAttribute("aria-pressed", "false");
    expect(dialog.querySelector("summary")).toHaveTextContent("View chart data (99 tests)");
  });

  it("labels character estimates rather than claiming measured keystrokes", () => {
    openChart([baseResult], "characters", "20,000");
    expect(screen.getByRole("dialog", { name: "Recent estimated characters" })).toBeInTheDocument();
    expect(fixture.chartData[0].value).toBe(200);
  });

  it("marks the earliest tied extrema without modifying saved results", () => {
    const results = Object.freeze([90, 60, 90, 60].map((wpm, index) => Object.freeze({
      ...baseResult, wpm, createdAt: baseResult.createdAt - index * 60_000,
    })));
    openChart([...results]);
    expect(fixture.chartData.map(({ value, isBest, isLowest }) => ({ value, isBest, isLowest }))).toEqual([
      { value: 60, isBest: false, isLowest: true },
      { value: 90, isBest: true, isLowest: false },
      { value: 60, isBest: false, isLowest: false },
      { value: 90, isBest: false, isLowest: false },
    ]);
    expect(results.map((result) => result.wpm)).toEqual([90, 60, 90, 60]);
  });

  it("keeps an invalid-only recent history distinct from missing history", () => {
    openChart([{ ...baseResult, verification: "invalid" }]);
    expect(screen.getByText(/Tests shown: 0 of the latest 1 saved/)).toBeInTheDocument();
    expect(screen.getByText("No tests in the recent history sample can be shown here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Highest in sample" })).not.toBeInTheDocument();
  });

  it("leaves unverified and invalid saves out of the chart", () => {
    openChart([
      { ...baseResult, wpm: 80 },
      { ...baseResult, wpm: 99, verification: "unverified", createdAt: baseResult.createdAt + 1 },
      { ...baseResult, wpm: 120, verification: "invalid", createdAt: baseResult.createdAt + 2 },
    ]);
    const chart = screen.getByRole("dialog", { name: "Recent WPM" });
    expect(within(chart).getByText(/Tests shown: 1 of the latest 3 saved/)).toBeInTheDocument();
    expect(fixture.chartData.map((point) => point.value)).toEqual([80]);
  });
});
