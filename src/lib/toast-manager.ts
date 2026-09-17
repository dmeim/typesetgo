import { Toast } from "@base-ui/react/toast";
import type { NotificationMetadata, NotificationType } from "@/lib/notification-state";

export interface ToastData {
  notificationType?: NotificationType;
  metadata?: NotificationMetadata;
}

// Keep the manager outside the component module for Fast Refresh and shared delivery.
export const toast = Toast.createToastManager<ToastData>();
