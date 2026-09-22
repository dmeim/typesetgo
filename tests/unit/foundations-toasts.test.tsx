import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import { NotificationProvider, useNotifications } from "@/lib/notification-store";
import { useNotify } from "@/hooks/useNotify";
import { toast } from "@/lib/toast-manager";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";

const achievement = getAchievementsByCategory("speed")[0];
function DeliveryProbe() {
  const notify = useNotify();
  const { notifications, getUnreadCount } = useNotifications();
  return <>
    <input aria-label="Practice input" />
    <button onClick={() => notify({ type: "achievement", title: achievement.title,
      description: achievement.description, metadata: { achievementId: achievement.id, achievementTier: achievement.tier } })}>Award achievement</button>
    <button onClick={() => notify({ type: "info", title: "Copied" }, { persist: false })}>Copy</button>
    <output data-testid="history">{notifications.length}/{getUnreadCount()}</output>
  </>;
}

function Fixture() {
  return <StrictMode><NotificationProvider><DeliveryProbe /><Toaster /></NotificationProvider></StrictMode>;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("toast delivery and browser notification history", () => {
  it("delivers one achievement, dismisses only its popup, and never replays history on remount", async () => {
    const view = render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "Award achievement" }));
    expect(await screen.findByRole("dialog", { name: achievement.title })).toBeInTheDocument();
    expect(screen.getByTestId("history")).toHaveTextContent("1/1");
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(1);
    const stored = JSON.parse(localStorage.getItem("typesetgo_notifications:guest")!);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: "achievement", read: false, metadata: { achievementId: achievement.id } });
    fireEvent.click(screen.getByRole("button", { name: "Ok", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: achievement.title })).not.toBeInTheDocument());
    expect(screen.getByTestId("history")).toHaveTextContent("1/1");
    view.unmount();
    render(<Fixture />);
    expect(screen.getByTestId("history")).toHaveTextContent("1/1");
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(0);
  });

  it("keeps transient feedback out of history and does not take typing focus", async () => {
    render(<Fixture />);
    const input = screen.getByRole("textbox", { name: "Practice input" });
    input.focus();
    fireEvent.click(screen.getByRole("button", { name: "Copy", exact: true }));
    expect(await screen.findByRole("dialog", { name: "Copied" })).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(screen.getByTestId("history")).toHaveTextContent("0/0");
    act(() => screen.getByRole("dialog", { name: "Copied" }).focus());
    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Copied" })).not.toBeInTheDocument());
  });

  it("updates an existing event instead of duplicating it and supports automatic dismissal", async () => {
    render(<Toaster timeout={30} />);
    act(() => { toast.add({ id: "save", title: "Saving", type: "loading", timeout: 0 }); });
    expect(await screen.findByRole("dialog", { name: "Saving" })).toBeInTheDocument();
    act(() => { toast.update("save", { title: "Saved", type: "success", timeout: 30 }); });
    expect(screen.getByRole("dialog", { name: "Saved" })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Saved" })).not.toBeInTheDocument());
  });
});
