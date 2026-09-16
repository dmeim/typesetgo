import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AchievementsCategoryGrid from "@/components/auth/AchievementsCategoryGrid";
import AchievementsModal from "@/components/auth/AchievementsModal";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";

const motion = vi.hoisted(() => ({ reduced: true }));
const carouselCalls = vi.hoisted(() => ({ next: vi.fn(), previous: vi.fn(), to: vi.fn() }));
vi.mock("framer-motion", () => ({ useReducedMotion: () => motion.reduced }));
vi.mock("embla-carousel-react", async () => {
  const { useMemo } = await import("react");
  return {
    default: (options: { startIndex: number }) => useMemo(() => {
      let index = options.startIndex;
      const listeners = new Map<string, Set<() => void>>();
      const emit = () => listeners.get("select")?.forEach((listener) => listener());
      const api = {
        selectedScrollSnap: () => index,
        canScrollPrev: () => index > 0,
        canScrollNext: () => true,
        scrollPrev: (jump: boolean) => { carouselCalls.previous(jump); index = Math.max(0, index - 1); emit(); },
        scrollNext: (jump: boolean) => { carouselCalls.next(jump); index += 1; emit(); },
        scrollTo: (target: number, jump: boolean) => { carouselCalls.to(target, jump); index = target; emit(); },
        on: (event: string, listener: () => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(listener);
          return api;
        },
        off: (event: string, listener: () => void) => { listeners.get(event)?.delete(listener); return api; },
      };
      return [() => {}, api];
    }, []),
  };
});

beforeEach(() => {
  motion.reduced = true;
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const firstSpeed = getAchievementsByCategory("speed")[0];

describe("achievement refresh ownership", () => {
  it("renders a read-only visitor without requiring Clerk or Convex providers", () => {
    render(<AchievementsCategoryGrid earnedAchievements={{}} />);
    expect(screen.queryByRole("button", { name: /Refresh achievements/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View all achievements: 0 of/ })).toBeVisible();
  });

  it("distinguishes loading from an empty earned collection", () => {
    render(<AchievementsCategoryGrid earnedAchievements={{}} isLoading onRefresh={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading achievements");
    expect(screen.queryByRole("button", { name: /View all achievements/ })).not.toBeInTheDocument();
    expect(screen.queryByText("None earned yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh achievements" })).toBeDisabled();
  });

  it("runs only the supplied capability once while pending, then permits retry", async () => {
    let resolveRefresh!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((resolve) => { resolveRefresh = resolve; }));
    render(<AchievementsCategoryGrid earnedAchievements={{}} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
    const pending = screen.getByRole("button", { name: "Refreshing…" });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith();
    await act(async () => resolveRefresh());
    expect(screen.getByRole("button", { name: "Refresh achievements" })).toBeEnabled();
  });

  it("shows a refresh failure in context and clears it on a successful retry", async () => {
    const onRefresh = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(undefined);
    render(<AchievementsCategoryGrid earnedAchievements={{ [firstSpeed.id]: 123 }} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Achievements could not be refreshed");
    expect(screen.getByRole("button", { name: /Speed Demons: 1 of/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});

describe("achievement dialogs", () => {
  it("opens a category, traps detail focus, and restores each opener after nested Escape", async () => {
    render(<AchievementsCategoryGrid earnedAchievements={{ [firstSpeed.id]: 123 }} />);
    const opener = screen.getByRole("button", { name: /Speed Demons: 1 of/ });
    opener.focus();
    fireEvent.click(opener);
    const board = screen.getByRole("dialog", { name: "All Achievements" });
    const heading = within(board).getByRole("heading", { name: /Speed Demons/ });
    expect(heading).toHaveFocus();
    const card = within(board).getByRole("button", { name: `Speed Demons: ${firstSpeed.title}, ${firstSpeed.tier}, earned` });
    card.focus();
    fireEvent.click(card);
    const detail = screen.getByRole("dialog", { name: "Achievement details" });
    const detailClose = within(detail).getByRole("button", { name: "Close" });
    detailClose.focus();
    fireEvent.keyDown(detailClose, { key: "Tab" });
    expect(detail.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Achievement details" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "All Achievements" })).toBeVisible();
    await waitFor(() => expect(card).toHaveFocus());
    fireEvent.keyDown(card, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("focuses a notification's exact achievement and navigates categories with a native control", () => {
    render(<AchievementsModal earnedAchievements={{}} initialAchievementId={firstSpeed.id} onClose={vi.fn()} />);
    const card = screen.getByRole("button", { name: `Speed Demons: ${firstSpeed.title}, ${firstSpeed.tier}, not yet earned` });
    expect(card).toHaveFocus();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "instant" });
    fireEvent.change(screen.getByRole("combobox", { name: "Jump to achievement category" }), { target: { value: "words" } });
    expect(screen.getByRole("heading", { name: /Word Warrior/ })).toHaveFocus();
  });

  it("supports one-step arrow navigation and direct selection without movement under reduced motion", () => {
    render(<AchievementsModal earnedAchievements={{}} initialCategory="speed" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: `Speed Demons: ${firstSpeed.title}, ${firstSpeed.tier}, not yet earned` }));
    const detail = screen.getByRole("dialog", { name: "Achievement details" });
    fireEvent.keyDown(within(detail).getByRole("region", { name: "Achievement details" }), { key: "ArrowRight" });
    expect(carouselCalls.next).toHaveBeenCalledTimes(1);
    expect(carouselCalls.next).toHaveBeenCalledWith(true);
    expect(within(detail).getByRole("status")).toHaveTextContent(/^2 \//);
    const chooser = within(detail).getByRole("combobox", { name: "Choose achievement" });
    fireEvent.change(chooser, { target: { value: "3" } });
    expect(carouselCalls.to).toHaveBeenCalledWith(3, true);
    fireEvent.keyDown(chooser, { key: "ArrowLeft" });
    expect(carouselCalls.previous).not.toHaveBeenCalled();
    fireEvent.click(within(detail).getByRole("button", { name: "Previous achievement" }));
    expect(carouselCalls.previous).toHaveBeenCalledWith(true);
  });
});
