import { useCallback } from "react";
import { useNotifications, type Notification } from "@/lib/notification-store";
import { celebrateAchievement } from "@/lib/achievement-celebrations";
import { getAchievementById } from "@/lib/achievement-definitions";
import { toast } from "@/lib/toast-manager";

type NotificationInput = Omit<Notification, "id" | "timestamp" | "read">;

/**
 * Deliver a new event to the browser notification history (by default) and announce it: known achievements
 * play the full-screen celebration when the app's host is mounted; everything else is a toast.
 */
export function useNotify() {
  const { addNotification } = useNotifications();

  return useCallback((notification: NotificationInput, { persist = true } = {}) => {
    const saved = persist ? addNotification(notification) : undefined;
    const achievement = notification.type === "achievement";
    const achievementId = achievement ? notification.metadata?.achievementId : undefined;
    if (achievementId && getAchievementById(achievementId)
      && celebrateAchievement({ achievementId, notificationId: saved?.id, earnedAt: saved?.timestamp })) {
      return saved?.id ?? achievementId;
    }
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
