import { useRef } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/layout/Header";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { AccountContext, unavailableAccount } from "@/components/layout/useAccount";
import { AppAuthContext, unavailableAuth, type AppAuthUser } from "@/components/layout/useAppAuth";
import { NotificationProvider, type Notification } from "@/lib/notification-store";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";

const backend = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn().mockResolvedValue(undefined) }));
vi.mock("convex/react", () => ({ useQuery: backend.query, useMutation: () => backend.mutation }));
vi.mock("@clerk/clerk-react", () => ({
  useUser: () => { throw new Error("Unexpected Clerk hook without provider"); },
  useClerk: () => { throw new Error("Unexpected Clerk hook without provider"); },
}));
vi.mock("@/hooks/useTheme", async () => {
  const { getDefaultTheme } = await import("@/lib/themes");
  const colors = getDefaultTheme().dark;
  return { useTheme: () => ({ colors, mode: "dark", supportsLightMode: true, toggleMode: vi.fn() }) };
});

beforeEach(() => {
  localStorage.clear();
  backend.query.mockReset();
  backend.mutation.mockClear();
});
afterEach(cleanup);

function Shell({ hidden = false }: { hidden?: boolean }) {
  const mainRef = useRef<HTMLElement>(null);
  return <MemoryRouter><NotificationProvider><Header hidden={hidden} focusTargetRef={mainRef} onOpenSettings={() => {}} /><main ref={mainRef} tabIndex={-1}><input aria-label="Practice input" /></main></NotificationProvider></MemoryRouter>;
}

type ShellAuth = Parameters<typeof AppAuthContext.Provider>[0]["value"];
type ShellAccount = Parameters<typeof AccountContext.Provider>[0]["value"];
const signedInAuth: ShellAuth = { ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, unavailableReason: null, user: { id: "user_1", username: "pixel" } as AppAuthUser };

function DockShell({ auth = unavailableAuth, account = unavailableAccount, path = "/", tools = true }: { auth?: ShellAuth; account?: ShellAccount; path?: string; tools?: boolean }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AppAuthContext.Provider value={auth}>
        <AccountContext.Provider value={account}>
          <NotificationProvider>
            <Header onOpenThemeModal={tools ? () => {} : undefined} onOpenSettings={tools ? () => {} : undefined} />
          </NotificationProvider>
        </AccountContext.Provider>
      </AppAuthContext.Provider>
    </MemoryRouter>
  );
}

const notification = (id: string, title: string): Notification => ({ id, title, type: "info", description: "A notification", timestamp: Date.now(), read: false });

function Notifications() {
  return <MemoryRouter><AppAuthContext.Provider value={{ ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, user: { id: "user_1" } as AppAuthUser }}><NotificationProvider><NotificationCenter /></NotificationProvider></AppAuthContext.Provider></MemoryRouter>;
}

describe("responsive shell semantics and focus", () => {
  it("runs without Clerk and explains unavailable account features", async () => {
    render(<Shell />);
    expect(screen.getByRole("link", { name: "TypeSetGo home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Type", exact: true })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Race" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Account unavailable" }));
    expect(await screen.findByRole("heading", { name: "Sign-in unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/You can practice as a guest/)).toBeInTheDocument();
    expect(backend.query.mock.calls.every((call) => call[1] === "skip")).toBe(true);
    expect(backend.mutation).not.toHaveBeenCalled();
  });

  it("makes hidden chrome inert and recovers focus without leaving invisible tab stops", () => {
    const { rerender } = render(<Shell />);
    const settings = screen.getByRole("button", { name: "Settings" });
    settings.focus();
    rerender(<Shell hidden />);
    const header = document.querySelector("header")!;
    expect(header).toHaveAttribute("inert");
    expect(header).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    rerender(<Shell />);
    expect(header).not.toHaveAttribute("inert");
    expect(settings).toHaveFocus();
  });

  it("closes portaled account content in focus mode without reopening it afterward", async () => {
    const { rerender } = render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Account unavailable" }));
    expect(await screen.findByRole("heading", { name: "Sign-in unavailable" })).toBeInTheDocument();
    rerender(<Shell hidden />);
    expect(screen.queryByRole("heading", { name: "Sign-in unavailable" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    rerender(<Shell />);
    expect(screen.queryByRole("heading", { name: "Sign-in unavailable" })).not.toBeInTheDocument();
  });

  it("does not steal focus from the typing input as chrome hides or returns", () => {
    const { rerender } = render(<Shell />);
    const input = screen.getByRole("textbox", { name: "Practice input" });
    input.focus();
    rerender(<Shell hidden />);
    expect(input).toHaveFocus();
    rerender(<Shell />);
    expect(input).toHaveFocus();
  });
});

describe("dock header navigation and account", () => {
  it("marks the current page, keeps unopened modes out of the link list and only offers dialogs a page provides", () => {
    const view = render(<DockShell path="/connect/join" />);
    const modes = screen.getByRole("navigation", { name: "Practice modes" });
    expect(within(modes).getByRole("link", { name: "Connect", exact: true })).toHaveAttribute("aria-current", "page");
    expect(within(modes).getByRole("link", { name: "Type", exact: true })).not.toHaveAttribute("aria-current");
    expect(within(modes).getByRole("button", { name: "Race (coming soon)" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Leaderboard", exact: true })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByRole("button", { name: "Change theme", exact: true })).toBeInTheDocument();
    view.unmount();
    render(<DockShell tools={false} />);
    expect(screen.queryByRole("button", { name: "Change theme" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("offers sign-in when signed out", () => {
    const openSignIn = vi.fn().mockResolvedValue(true);
    render(<DockShell auth={{ ...unavailableAuth, available: true, status: "signed-out", unavailableReason: null, openSignIn }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(openSignIn).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Sign in to view notifications" })).toBeDisabled();
  });

  it("links the signed-in account menu to your stats", async () => {
    render(<DockShell auth={signedInAuth} account={{ ...unavailableAccount, status: "ready", userId: "abc123" as ShellAccount["userId"] }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Account: pixel" }), { key: "Enter" });
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Your stats/ })).toHaveAttribute("href", "/profile/abc123");
    expect(within(menu).getByRole("menuitem", { name: "Account settings" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("lets a failed account connection be retried from the account menu", async () => {
    const ensureAccount = vi.fn().mockResolvedValue("abc123");
    render(<DockShell auth={signedInAuth} account={{ ...unavailableAccount, status: "error", error: "Account sync failed", ensureAccount }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Account: pixel" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /Retry account connection/ }));
    expect(ensureAccount).toHaveBeenCalledOnce();
  });
});

describe("notification actions", () => {
  it("uses independent buttons and keeps removal separate from activation", async () => {
    localStorage.setItem("typesetgo_notifications:user:user_1", JSON.stringify([notification("1", "First update"), notification("2", "Second update")]));
    render(<Notifications />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 2 unread" }));
    const popup = await screen.findByRole("dialog", { name: "Notifications" });
    const remove = within(popup).getByRole("button", { name: "Remove notification: First update" });
    expect(remove.closest('[role="menuitem"]')).toBeNull();
    expect(remove.parentElement?.closest("button")).toBeNull();
    remove.focus();
    fireEvent.click(remove);
    expect(screen.queryByRole("button", { name: "First update, unread" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second update, unread" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Notifications/ })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Second update, unread" }));
    expect(screen.getByRole("button", { name: "Second update", exact: true })).toBeInTheDocument();
  });

  it("closes with Escape and restores focus to its trigger", async () => {
    render(<Notifications />);
    const trigger = screen.getByRole("button", { name: "Notifications" });
    trigger.focus();
    fireEvent.click(trigger);
    const popup = await screen.findByRole("dialog", { name: "Notifications" });
    fireEvent.keyDown(popup, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps a focus destination after clearing the list", async () => {
    localStorage.setItem("typesetgo_notifications:user:user_1", JSON.stringify([notification("1", "First update")]));
    render(<Notifications />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear all" }));
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Notifications/ })).toHaveFocus();
  });
});


it("waits for account readiness before querying a stored achievement", () => {
  const badge = getAchievementsByCategory("speed")[0];
  localStorage.setItem("typesetgo_notifications:user:user_1", JSON.stringify([{ ...notification("badge", "Earned badge"), type: "achievement", metadata: { achievementId: badge.id } }]));
  const view = render(<AccountContext.Provider value={{ ...unavailableAccount, status: "loading" }}><Notifications /></AccountContext.Provider>);
  fireEvent.click(screen.getByRole("button", { name: /Notifications, 1 unread/ }));
  fireEvent.click(screen.getByRole("button", { name: "Earned badge, unread. Open achievement" }));
  expect(screen.getByRole("dialog", { name: badge.title })).toBeInTheDocument();
  expect(backend.query.mock.calls.every((call) => call[1] === "skip")).toBe(true);
  view.rerender(<AccountContext.Provider value={{ ...unavailableAccount, status: "ready" }}><Notifications /></AccountContext.Provider>);
  expect(backend.query.mock.calls.at(-1)?.[1]).toEqual({ clerkId: "user_1" });
});
