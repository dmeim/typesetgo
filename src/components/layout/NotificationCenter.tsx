import { useId, useRef, useState } from "react";
import { BellIcon, TrophyIcon, WrenchIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, CheckIcon, Trash2Icon, XIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { useNotifications, getRelativeTime, getNotificationColor, type Notification } from "@/lib/notification-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import AchievementsModal from "@/components/auth/AchievementsModal";

function NotificationIcon({ notification }: { notification: Notification }) {
  const color = notification.type === "achievement" && notification.metadata?.achievementTier
    ? TIER_COLORS[notification.metadata.achievementTier as keyof typeof TIER_COLORS]?.bg || getNotificationColor(notification.type)
    : getNotificationColor(notification.type);
  const Icon = ({ achievement: TrophyIcon, maintenance: WrenchIcon, warning: AlertTriangleIcon, error: XCircleIcon, info: InfoIcon })[notification.type] ?? InfoIcon;
  return <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} aria-hidden="true" />;
}

export default function NotificationCenter({ disabled = false }: { disabled?: boolean }) {
  const { user, isSignedIn, available } = useAppAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, removeNotification, getUnreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  if (disabled && (open || selectedAchievementId)) {
    setOpen(false);
    setSelectedAchievementId(null);
  }
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const earnedAchievements = useQuery(
    api.achievements.getUserAchievements,
    isSignedIn && user && selectedAchievementId ? { clerkId: user.id } : "skip"
  ) ?? {};
  const unreadCount = disabled ? 0 : getUnreadCount();

  const activate = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.type === "achievement" && notification.metadata?.achievementId) {
      setSelectedAchievementId(notification.metadata.achievementId);
      setOpen(false);
    } else if (notification.metadata?.actionUrl) {
      const url = new URL(notification.metadata.actionUrl, window.location.href);
      if (url.protocol === "https:" || url.protocol === "http:") {
        window.open(url.href, "_blank", "noopener,noreferrer");
      }
      setOpen(false);
    }
  };

  if (disabled) {
    const label = available ? "Sign in to view notifications" : "Notifications unavailable in guest mode";
    return <button type="button" className="inline-flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground" disabled aria-label={label} title={label}><BellIcon className="size-5" aria-hidden="true" /></button>;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button ref={triggerRef} variant="ghost" size="icon" className="relative size-10" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} title="Notifications">
            <BellIcon className="size-5" aria-hidden="true" />
            {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-labelledby={headingId}
          className="w-80 max-w-[calc(100vw-1.5rem)] p-0"
          onCloseAutoFocus={(event) => { if (selectedAchievementId) event.preventDefault(); }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-sm font-semibold">Notifications</h2>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)} aria-label="Close notifications"><XIcon className="size-4" aria-hidden="true" /></Button>
          </div>
          {notifications.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p> : (
            <>
              <div className="flex flex-wrap gap-1 border-b border-border p-2">
                {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => { markAllAsRead(); headingRef.current?.focus(); }}><CheckIcon className="size-4" aria-hidden="true" />Mark all read</Button>}
                <Button variant="ghost" size="sm" onClick={() => { clearAll(); headingRef.current?.focus(); }}><Trash2Icon className="size-4" aria-hidden="true" />Clear all</Button>
              </div>
              <ul aria-label="Notifications" className="max-h-72 overflow-y-auto overscroll-contain p-1">
                {notifications.map((notification) => (
                  <li key={notification.id} className={`flex items-start gap-1 rounded-md ${notification.read ? "" : "bg-muted"}`}>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-3 text-left hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => activate(notification)}
                      aria-label={`${notification.title}${notification.read ? "" : ", unread"}`}
                    >
                      <NotificationIcon notification={notification} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium">{notification.title}</span>
                        <span className="mt-1 block break-words text-xs text-muted-foreground">{notification.description}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{getRelativeTime(notification.timestamp)}</span>
                      </span>
                    </button>
                    <Button variant="ghost" size="icon" className="mr-1 mt-1 size-9 shrink-0" aria-label={`Remove notification: ${notification.title}`} onClick={() => { removeNotification(notification.id); headingRef.current?.focus(); }}>
                      <XIcon className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </PopoverContent>
      </Popover>
      {selectedAchievementId && <AchievementsModal earnedAchievements={earnedAchievements} initialAchievementId={selectedAchievementId} onClose={() => { setSelectedAchievementId(null); triggerRef.current?.focus(); }} />}
    </>
  );
}
