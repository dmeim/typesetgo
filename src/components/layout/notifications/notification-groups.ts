// Pure helpers for the Dock's notification center.
import { relativeDay } from "@/components/profile/profile-stats";
import { translateLegacyId } from "@/lib/achievement-definitions";
import type { Notification } from "@/lib/notification-store";

export interface NotificationDay {
  label: string;
  notifications: Notification[];
}

/** Notifications grouped under Today, Yesterday, a weekday or a date; newest first. */
export function groupByDay(notifications: readonly Notification[], now = Date.now()): NotificationDay[] {
  const days: NotificationDay[] = [];
  for (const notification of [...notifications].sort((a, b) => b.timestamp - a.timestamp)) {
    const label = relativeDay(notification.timestamp, now);
    const day = days.find((entry) => entry.label === label);
    if (day) day.notifications.push(notification);
    else days.push({ label, notifications: [notification] });
  }
  return days;
}

/** Earned times the history already knows about, so cards render before saved achievements load. */
export function earnedFromHistory(notifications: readonly Notification[]): Record<string, number> {
  const earned: Record<string, number> = {};
  for (const notification of notifications) {
    const id = notification.type === "achievement" ? notification.metadata?.achievementId : undefined;
    if (id && !(translateLegacyId(id) in earned)) earned[translateLegacyId(id)] = notification.timestamp;
  }
  return earned;
}

/** Only absolute http(s) links (relative ones resolve against this page) may open from a stored notification. */
export function safeActionUrl(actionUrl: string | undefined, base = window.location.href): string | null {
  if (!actionUrl) return null;
  try {
    const url = new URL(actionUrl, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Spoken name for a notification button: title, then whether it is unread. */
export const notificationLabel = (notification: Notification) => `${notification.title}${notification.read ? "" : ", unread"}`;

/** Shared by a list card and the opened card so one grows into the other. */
export const cardLayoutId = (notification: Notification) => `notification-card-${notification.id}`;

/** DOM id of a notification's button, used to hand focus back after the opened card closes. */
export const itemDomId = (baseId: string, notification: Notification) => `${baseId}-${notification.id}`;
