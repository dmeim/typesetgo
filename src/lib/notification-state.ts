import {
  createContext,
  useContext,
} from "react";

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
  [key: string]: unknown; // Future extensibility
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

const STORAGE_KEY = "typesetgo_notifications";
export const MAX_NOTIFICATIONS = 50; // Limit stored notifications

function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function saveNotifications(notifications: Notification[]): void {
  if (!isLocalStorageAvailable()) return;

  try {
    // Only keep the most recent notifications
    const toStore = notifications.slice(0, MAX_NOTIFICATIONS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.warn("Failed to save notifications to localStorage:", error);
  }
}

export function loadNotifications(): Notification[] {
  if (!isLocalStorageAvailable()) return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // Validate each notification has required fields
    return parsed.filter(
      (n: unknown): n is Notification =>
        typeof n === "object" &&
        n !== null &&
        typeof (n as Notification).id === "string" &&
        typeof (n as Notification).type === "string" &&
        typeof (n as Notification).title === "string" &&
        typeof (n as Notification).timestamp === "number"
    );
  } catch (error) {
    console.warn("Failed to load notifications from localStorage:", error);
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
      return "#FFD700"; // Gold - will be overridden by tier color
    case "maintenance":
      return "#F59E0B"; // Amber
    case "warning":
      return "#EAB308"; // Yellow
    case "error":
      return "#EF4444"; // Red
    case "info":
    default:
      return "#3B82F6"; // Blue
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
