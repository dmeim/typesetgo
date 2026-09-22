import {
  createContext,
  useContext,
} from "react";
import { tv } from "@/lib/theme-vars";

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | "achievement"
  | "maintenance"
  | "info"
  | "warning"
  | "error";

export interface NotificationMetadata {
  achievementId?: string; // For achievement notifications
  achievementTier?: string; // copper, silver, gold, diamond, emerald
  actionUrl?: string; // For notifications with custom links
  severity?: string; // For maintenance/warning notifications
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  metadata?: NotificationMetadata;
}

export interface NotificationStore {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ) => Notification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  getUnreadCount: () => number;
}

// =============================================================================
// Storage
// =============================================================================

export const MAX_NOTIFICATIONS = 50; // Limit stored notifications

export function notificationStorageKey(ownerId: string | null = null): string {
  return `typesetgo_notifications:${ownerId ? `user:${ownerId}` : "guest"}`;
}

export function saveNotifications(notifications: Notification[], ownerId: string | null = null): void {
  try {
    const toStore = notifications.slice(0, MAX_NOTIFICATIONS);
    window.localStorage.setItem(notificationStorageKey(ownerId), JSON.stringify(toStore));
  } catch {
    // This tab's history remains usable when browser storage is unavailable.
  }
}

function decodeNotification(value: unknown): Notification | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.title !== "string"
    || typeof record.description !== "string" || typeof record.read !== "boolean"
    || typeof record.timestamp !== "number" || !Number.isFinite(record.timestamp) || record.timestamp < 0
    || typeof record.type !== "string"
    || !["achievement", "maintenance", "info", "warning", "error"].includes(record.type)) return null;
  const metadata: NotificationMetadata = {};
  if (record.metadata && typeof record.metadata === "object") {
    const source = record.metadata as Record<string, unknown>;
    for (const key of ["achievementId", "achievementTier", "actionUrl", "severity"] as const) {
      if (typeof source[key] === "string") metadata[key] = source[key];
    }
  }
  return { id: record.id, title: record.title, description: record.description,
    type: record.type as NotificationType, read: record.read, timestamp: record.timestamp, ...(Object.keys(metadata).length ? { metadata } : {}) };
}

export function loadNotifications(ownerId: string | null = null): Notification[] {
  try {
    const stored = window.localStorage.getItem(notificationStorageKey(ownerId));
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(decodeNotification).filter((item): item is Notification => item !== null).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

// =============================================================================
// Context
// =============================================================================

export const NotificationContext = createContext<NotificationStore | null>(null);

export function useNotifications(): NotificationStore {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Get icon color based on notification type
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "achievement":
      return tv.ui.primary; // Achievement tiers override this fallback.
    case "maintenance":
      return tv.ui.warning;
    case "warning":
      return tv.ui.warning;
    case "error":
      return tv.ui.destructive;
    case "info":
    default:
      return tv.ui.primary;
  }
}

/**
 * Get human-readable relative time
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
