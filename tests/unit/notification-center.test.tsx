import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { groupByDay, safeActionUrl } from "@/components/layout/notifications/notification-groups";
import { AccountContext, unavailableAccount } from "@/components/layout/useAccount";
import { AppAuthContext, unavailableAuth, type AppAuthUser } from "@/components/layout/useAppAuth";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";
import { NotificationProvider, type Notification } from "@/lib/notification-store";

const backend = vi.hoisted(() => ({ earned: undefined as Record<string, number> | undefined, query: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery: (...args: unknown[]) => { backend.query(...args); return args[1] === "skip" ? undefined : backend.earned; } }));
vi.mock("@/hooks/useTheme", async () => {
  const { getDefaultTheme } = await import("@/lib/themes");
  const colors = getDefaultTheme().dark;
  return { useTheme: () => ({ colors }) };
});

const DAY = 24 * 60 * 60 * 1000;
const speed = getAchievementsByCategory("speed");
const signedIn = { ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, unavailableReason: null, user: { id: "user_1" } as AppAuthUser } as const;

const notice = (id: string, title: string, extra: Partial<Notification> = {}): Notification => ({
  id, title, type: "info", description: `${title} details`, timestamp: Date.now(), read: false, ...extra,
});
const badge = (id: string, achievementId: string, extra: Partial<Notification> = {}) =>
  notice(id, `Badge ${id}`, { type: "achievement", metadata: { achievementId }, ...extra });

function store(notifications: Notification[]) {
  localStorage.setItem("typesetgo_notifications:user:user_1", JSON.stringify(notifications));
}

function Center({ auth = signedIn, disabled = false }: { auth?: Parameters<typeof AppAuthContext.Provider>[0]["value"]; disabled?: boolean }) {
  return (
    <MemoryRouter>
      <AppAuthContext.Provider value={auth}>
        <AccountContext.Provider value={{ ...unavailableAccount, status: "ready" }}>
          <NotificationProvider><NotificationCenter disabled={disabled} /></NotificationProvider>
        </AccountContext.Provider>
      </AppAuthContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  backend.earned = {};
  backend.query.mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("notification center day cards", () => {
  it("groups by day and shows achievements as collector cards with their tier", async () => {
    store([
      badge("new", speed[1].id),
      notice("update", "Maintenance tonight", { type: "maintenance", timestamp: Date.now() - DAY, read: true }),
      notice("old", "Old news", { timestamp: Date.now() - 20 * DAY, read: true }),
    ]);
    render(<Center />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    const popup = await screen.findByRole("dialog", { name: "Notifications" });
    expect(within(popup).getByText("1 new")).toBeInTheDocument();
    const days = within(popup).getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(days.slice(0, 2)).toEqual(["Today", "Yesterday"]);
    expect(days).toHaveLength(3);
    const today = within(popup).getByRole("region", { name: "Today" });
    const card = within(today).getByRole("button", { name: "Badge new, unread. Open achievement" });
    expect(card.querySelector("[data-achievement-tier]")).toHaveAttribute("data-achievement-tier", speed[1].tier);
    expect(card).toHaveTextContent(speed[1].title);
    expect(backend.query).toHaveBeenLastCalledWith(expect.anything(), { clerkId: "user_1" });
  });

  it("grows an achievement into the full card and journey, then Escape steps back before closing", async () => {
    backend.earned = { [speed[0].id]: Date.now() - 5 * DAY };
    store([badge("new", speed[1].id)]);
    render(<Center />);
    const bell = screen.getByRole("button", { name: "Notifications, 1 unread" });
    bell.focus();
    fireEvent.click(bell);
    fireEvent.click(await screen.findByRole("button", { name: "Badge new, unread. Open achievement" }));
    const detail = screen.getByRole("dialog", { name: speed[1].title });
    expect(within(detail).getByRole("button", { name: "Back to notifications" })).toHaveFocus();
    expect(within(detail).getByText("On the journey")).toBeInTheDocument();
    expect(within(detail).getByText("Just earned")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: "Every achievement" })).toHaveAttribute("href", "/profile/achievements");
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    const card = await screen.findByRole("button", { name: "Badge new. Open achievement" });
    await waitFor(() => expect(card).toHaveFocus());
    fireEvent.keyDown(card, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(bell).toHaveFocus());
  });

  it("removes one card, marks all read and clears, keeping focus on the heading", async () => {
    store([badge("a", speed[0].id), notice("b", "Second update")]);
    render(<Center />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 2 unread" }));
    const popup = await screen.findByRole("dialog", { name: "Notifications" });
    fireEvent.click(within(popup).getByRole("button", { name: "Remove notification: Badge a" }));
    expect(within(popup).queryByRole("button", { name: /Badge a/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Notifications/ })).toHaveFocus();
    fireEvent.click(within(popup).getByRole("button", { name: "Mark all read" }));
    expect(within(popup).getByRole("button", { name: "Mark all read" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    fireEvent.click(within(popup).getByRole("button", { name: "Clear all" }));
    expect(within(popup).getByText("No notifications yet")).toBeInTheDocument();
  });

  it("opens only http(s) links, in a new tab without an opener", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    store([
      notice("safe", "Read the release", { metadata: { actionUrl: "https://typesetgo.app/changelog" } }),
      notice("unsafe", "Sketchy link", { metadata: { actionUrl: "javascript:alert(1)" } }),
    ]);
    render(<Center />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 2 unread" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sketchy link, unread" }));
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sketchy link" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Read the release, unread" }));
    expect(open).toHaveBeenCalledWith("https://typesetgo.app/changelog", "_blank", "noopener,noreferrer");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("explains disabled guest and signed-out bells", () => {
    const view = render(<Center auth={unavailableAuth} disabled />);
    expect(screen.getByRole("button", { name: "Notifications unavailable in guest mode" })).toBeDisabled();
    view.rerender(<Center auth={{ ...unavailableAuth, available: true, status: "signed-out", unavailableReason: null }} disabled />);
    expect(screen.getByRole("button", { name: "Sign in to view notifications" })).toBeDisabled();
  });
});

describe("notification center helpers", () => {
  it("groups newest first and rejects non-web links", () => {
    const now = new Date(2026, 9, 27, 12).getTime();
    const days = groupByDay([notice("a", "Older", { timestamp: now - DAY }), notice("b", "Newer", { timestamp: now })], now);
    expect(days.map((day) => [day.label, day.notifications.map((item) => item.id)])).toEqual([["Today", ["b"]], ["Yesterday", ["a"]]]);
    expect(safeActionUrl("/changelog", "https://typesetgo.app/")).toBe("https://typesetgo.app/changelog");
    expect(safeActionUrl("data:text/html,hi")).toBeNull();
    expect(safeActionUrl("http://[bad")).toBeNull();
  });
});
