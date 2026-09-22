import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAppAuth } from "@/components/layout/useAppAuth";
import {
  NotificationContext,
  loadNotifications,
  saveNotifications,
  MAX_NOTIFICATIONS,
  type Notification,
  type NotificationStore,
} from "@/lib/notification-state";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useAppAuth();
  const ownerId = isSignedIn && user ? user.id : null;
  const [history, setHistory] = useState(() => ({ ownerId, notifications: loadNotifications(ownerId) }));
  if (history.ownerId !== ownerId) {
    setHistory({ ownerId, notifications: loadNotifications(ownerId) });
  }
  const { notifications } = history;
  useEffect(() => {
    saveNotifications(history.notifications, history.ownerId);
  }, [history]);

  const updateNotifications = useCallback((update: (previous: Notification[]) => Notification[]) => {
    setHistory((previous) => previous.ownerId === ownerId
      ? { ...previous, notifications: update(previous.notifications) } : previous);
  }, [ownerId]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
      };

      updateNotifications((prev) => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
      return newNotification;
    },
    [updateNotifications]
  );

  const markAsRead = useCallback((id: string) => {
    updateNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [updateNotifications]);

  const markAllAsRead = useCallback(() => {
    updateNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [updateNotifications]);

  const clearAll = useCallback(() => {
    updateNotifications(() => []);
  }, [updateNotifications]);

  const removeNotification = useCallback((id: string) => {
    updateNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [updateNotifications]);

  const getUnreadCount = useCallback(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const value: NotificationStore = {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    getUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
