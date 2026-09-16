// Preserve the store API while the provider remains a component-only boundary.
export { NotificationProvider } from "@/context/NotificationProvider";
export { useNotifications, getNotificationColor, getRelativeTime } from "@/lib/notification-state";
export type { Notification, NotificationType, NotificationMetadata, NotificationStore } from "@/lib/notification-state";
