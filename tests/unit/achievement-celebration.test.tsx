import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AchievementCelebration } from "@/components/achievements/AchievementCelebration";
import { Toaster } from "@/components/ui/toast";
import { useNotify } from "@/hooks/useNotify";
import { useHoldCelebrations } from "@/lib/achievement-celebrations";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";
import { NotificationProvider, useNotifications } from "@/lib/notification-store";

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => motion.reduced,
}));
vi.mock("convex/react", () => ({ useQuery: () => undefined }));
vi.mock("@/hooks/useTheme", async () => {
  const { getDefaultTheme } = await import("@/lib/themes");
  const colors = getDefaultTheme().dark;
  return { useTheme: () => ({ colors }) };
});

const speed = getAchievementsByCategory("speed");

function Probe({ onViewAll }: { onViewAll?: () => void }) {
  const notify = useNotify();
  const { notifications } = useNotifications();
  const [typing, setTyping] = useState(false);
  useHoldCelebrations(typing);
  const award = (count: number) => speed.slice(0, count).forEach((achievement) => notify({
    type: "achievement", title: achievement.title, description: achievement.description,
    metadata: { achievementId: achievement.id, achievementTier: achievement.tier },
  }));
  return <>
    <input aria-label="Typing input" />
    <button onClick={() => award(1)}>Award one</button>
    <button onClick={() => award(3)}>Award three</button>
    <button onClick={() => notify({ type: "info", title: "Copied", description: "" })}>Info</button>
    <button onClick={() => setTyping((value) => !value)}>Toggle typing</button>
    <output data-testid="unread">{notifications.filter((item) => !item.read).length}/{notifications.length}</output>
    <AchievementCelebration onViewAll={onViewAll} />
    <Toaster />
  </>;
}

const renderProbe = (onViewAll?: () => void) => render(<NotificationProvider><Probe onViewAll={onViewAll} /></NotificationProvider>);

beforeEach(() => {
  localStorage.clear();
  motion.reduced = false;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("achievement celebration", () => {
  it("replaces the toast with a full-screen moment and returns focus when done", async () => {
    renderProbe();
    const input = screen.getByRole("textbox", { name: "Typing input" });
    input.focus();
    fireEvent.click(screen.getByRole("button", { name: "Award one" }));
    const dialog = await screen.findByRole("dialog", { name: speed[0].title });
    expect(dialog).toHaveTextContent("Achievement unlocked");
    expect(dialog).not.toHaveTextContent(/unlocked ·/);
    expect(dialog.querySelector("[data-celebration-confetti]")).not.toBeNull();
    expect(within(dialog).getByRole("list", { name: new RegExp(`levels around ${speed[0].title}`) })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(0);
    expect(screen.getByTestId("unread")).toHaveTextContent("1/1");
    const nice = within(dialog).getByRole("button", { name: "Nice!" });
    await waitFor(() => expect(nice).toHaveFocus());
    expect(within(dialog).queryByRole("button", { name: /Skip/ })).not.toBeInTheDocument();
    fireEvent.click(nice);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("unread")).toHaveTextContent("0/1");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("queues several awards as 1 of N and Skip leaves the unseen ones unread", async () => {
    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "Award three" }));
    let dialog = await screen.findByRole("dialog", { name: speed[0].title });
    expect(dialog).toHaveTextContent("1 of 3");
    fireEvent.click(within(dialog).getByRole("button", { name: "Next achievement" }));
    dialog = await screen.findByRole("dialog", { name: speed[1].title });
    expect(dialog).toHaveTextContent("2 of 3");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Next achievement" })).toHaveFocus());
    fireEvent.click(within(dialog).getByRole("button", { name: "Skip the rest" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("unread")).toHaveTextContent("1/3");
  });

  it("closes with Escape and offers every level through the host", async () => {
    const onViewAll = vi.fn();
    renderProbe(onViewAll);
    fireEvent.click(screen.getByRole("button", { name: "Award one" }));
    const dialog = await screen.findByRole("dialog", { name: speed[0].title });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Award three" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Every level" }));
    expect(onViewAll).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("waits while a test is in progress and plays once typing stops", async () => {
    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "Toggle typing" }));
    fireEvent.click(screen.getByRole("button", { name: "Award one" }));
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle typing" }));
    expect(await screen.findByRole("dialog", { name: speed[0].title })).toBeInTheDocument();
  });

  it("drops confetti under reduced motion and keeps toasts for other notifications", async () => {
    motion.reduced = true;
    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "Award one" }));
    const dialog = await screen.findByRole("dialog", { name: speed[0].title });
    expect(dialog.querySelector("[data-celebration-confetti]")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Nice!" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: speed[0].title })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Info" }));
    expect(await screen.findByRole("dialog", { name: "Copied" })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(1);
  });
});
