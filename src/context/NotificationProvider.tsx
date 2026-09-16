import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  NotificationContext,
  loadNotifications,
  saveNotifications,
  MAX_NOTIFICATIONS,
  type Notification,
  type NotificationStore,
} from "@/lib/notification-state";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadNotifications()
  );

  // Persist to localStorage when notifications change
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
      return newNotification;
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

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
