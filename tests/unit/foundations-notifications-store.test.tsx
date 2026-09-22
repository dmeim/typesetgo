import { StrictMode, useLayoutEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NotificationProvider,
  useNotifications,
  type Notification,
  type NotificationStore,
} from "@/lib/notification-store";

const STORAGE_KEY = "typesetgo_notifications:guest";
let latest: NotificationStore;
function Probe() {
  const notifications = useNotifications();
  useLayoutEffect(() => { latest = notifications; });
  return <output data-testid="unread">{notifications.getUnreadCount()}</output>;
}

function storedNotifications(): Notification[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
}

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe("notification store compatibility boundary", () => {
  it("keeps restored and newly added notifications through StrictMode replay and provider remount", () => {
    const saved: Notification = {
      id: "saved", type: "info", title: "Existing notification", description: "Saved earlier",
      timestamp: 1, read: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saved]));
    const first = render(<StrictMode><NotificationProvider><Probe /></NotificationProvider></StrictMode>);
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
    let added!: Notification;
    act(() => {
      added = latest.addNotification({ type: "achievement", title: "Milestone", description: "First practice" });
      latest.markAsRead(saved.id);
    });
    expect(latest.notifications.map((notification) => notification.id)).toEqual([added.id, saved.id]);
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
    expect(storedNotifications()).toEqual([added, { ...saved, read: true }]);

    first.unmount();
    render(<NotificationProvider><Probe /></NotificationProvider>);
    expect(latest.notifications).toEqual([added, { ...saved, read: true }]);
    act(() => latest.markAllAsRead());
    expect(screen.getByTestId("unread")).toHaveTextContent("0");
    act(() => latest.removeNotification(saved.id));
    expect(storedNotifications()).toEqual([{ ...added, read: true }]);
    act(() => latest.clearAll());
    expect(storedNotifications()).toEqual([]);
  });
});
