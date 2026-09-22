import { useEffect, useLayoutEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificationProvider } from "@/context/NotificationProvider";
import { loadNotifications, saveNotifications, notificationStorageKey, useNotifications, type NotificationStore } from "@/lib/notification-state";
const fixture = vi.hoisted(() => ({ owner: null as string | null, mounts: 0 }));
vi.mock("@/components/layout/useAppAuth", () => ({ useAppAuth: () => ({ isSignedIn: !!fixture.owner, user: fixture.owner ? { id: fixture.owner } : null }) }));
let store: NotificationStore;
function Probe() { const value = useNotifications(); useLayoutEffect(() => { store = value; }); useEffect(() => { fixture.mounts++; }, []); return null; }
const notification = { id: "one", type: "info" as const, title: "Saved", description: "Example", read: false, timestamp: 1 };
beforeEach(() => { localStorage.clear(); fixture.owner = null; fixture.mounts = 0; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("isolates guest and account histories without remounting children or accepting stale callbacks", () => {
  localStorage.setItem("typesetgo_notifications", JSON.stringify([notification]));
  const view = render(<NotificationProvider><Probe /></NotificationProvider>);
  expect(store.notifications).toEqual([]);
  act(() => { store.addNotification({ ...notification, title: "Guest" }); });
  fixture.owner = "a";
  view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
  expect(store.notifications).toEqual([]);
  act(() => { store.addNotification({ ...notification, title: "Account A" }); });
  const staleAdd = store.addNotification;
  fixture.owner = "b";
  view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
  act(() => { staleAdd({ ...notification, title: "Late account A" }); });
  expect(store.notifications).toEqual([]);
  fixture.owner = "a";
  view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
  expect(store.notifications.map((item) => item.title)).toEqual(["Account A"]);
  fixture.owner = null;
  view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
  expect(store.notifications.map((item) => item.title)).toEqual(["Guest"]);
  expect(fixture.mounts).toBe(1);
});

it("decodes fields used by the UI, reads when writes fail, and does not probe storage", () => {
  localStorage.setItem(notificationStorageKey(), JSON.stringify([
    { ...notification, metadata: { achievementId: {}, actionUrl: 42, severity: "warning", unexpected: "discard" } },
    { ...notification, title: 42 }, { ...notification, read: "false" }, { ...notification, timestamp: -1 },
  ]));
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(loadNotifications()).toEqual([{ ...notification, metadata: { severity: "warning" } }]);
  expect(write).not.toHaveBeenCalled();
  expect(() => saveNotifications([notification])).not.toThrow();
  expect(write).toHaveBeenCalledTimes(1);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
  expect(loadNotifications()).toEqual([]);
});
