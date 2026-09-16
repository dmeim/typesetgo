import { useRef } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/layout/Header";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { AppAuthContext, unavailableAuth, type AppAuthUser } from "@/components/layout/useAppAuth";
import { NotificationProvider, type Notification } from "@/lib/notification-store";

const backend = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn().mockResolvedValue(undefined) }));
vi.mock("convex/react", () => ({ useQuery: backend.query, useMutation: () => backend.mutation }));
vi.mock("@clerk/clerk-react", () => ({
  useUser: () => { throw new Error("Unexpected Clerk hook without provider"); },
  useClerk: () => { throw new Error("Unexpected Clerk hook without provider"); },
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ mode: "dark", supportsLightMode: true, toggleMode: vi.fn() }) }));
vi.mock("@/components/auth/AchievementsModal", () => ({ default: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Achievements"><button onClick={onClose}>Close achievements</button></div> }));

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

const notification = (id: string, title: string): Notification => ({ id, title, type: "info", description: "A notification", timestamp: Date.now(), read: false });

function Notifications() {
  return <AppAuthContext.Provider value={{ ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, user: { id: "user_1" } as AppAuthUser }}><NotificationProvider><NotificationCenter /></NotificationProvider></AppAuthContext.Provider>;
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

describe("notification actions", () => {
  it("uses independent buttons and keeps removal separate from activation", async () => {
    localStorage.setItem("typesetgo_notifications", JSON.stringify([notification("1", "First update"), notification("2", "Second update")]));
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
    expect(screen.getByRole("heading", { name: "Notifications" })).toHaveFocus();
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
    localStorage.setItem("typesetgo_notifications", JSON.stringify([notification("1", "First update")]));
    render(<Notifications />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear all" }));
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notifications" })).toHaveFocus();
  });
});
