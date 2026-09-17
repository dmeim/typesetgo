import { useCallback } from "react";
import { useNotifications, type Notification } from "@/lib/notification-store";
import { toast } from "@/lib/toast-manager";

type NotificationInput = Omit<Notification, "id" | "timestamp" | "read">;

/** Deliver a new event to the toast and, by default, the browser notification history. */
export function useNotify() {
  const { addNotification } = useNotifications();

  return useCallback((notification: NotificationInput, { persist = true } = {}) => {
    const saved = persist ? addNotification(notification) : undefined;
    const achievement = notification.type === "achievement";
    const id = toast.add({
      id: saved?.id,
      title: notification.title,
      description: notification.description,
      type: achievement ? "success" : notification.type === "maintenance" ? "warning" : notification.type,
      timeout: achievement ? 5000 : 4000,
      data: { notificationType: notification.type, metadata: notification.metadata },
      ...(achievement ? {
        actionProps: { children: "Ok", onClick: () => toast.close(id) },
      } : {}),
    });
    return id;
  }, [addNotification]);
}
