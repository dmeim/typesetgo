import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BellIcon, ChecksIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { findLevel, laddersWith } from "@/components/achievements/achievement-levels";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import { AchievementNoticeDetail } from "./notifications/AchievementNoticeDetail";
import { earnedFromHistory, groupByDay, itemDomId, safeActionUrl } from "./notifications/notification-groups";
import { AchievementItem, EmptyNotifications, NoticeItem, SectionLabel } from "./notifications/NotificationItems";

const pill = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";

/**
 * The Dock's bell: a popover of your notifications grouped by day. Achievements are collector cards that
 * open into the full card and the levels around it. `className` styles the bell so each header can match.
 */
export default function NotificationCenter({ disabled = false, className }: { disabled?: boolean; className?: string }) {
  const { user, isSignedIn, available } = useAppAuth();
  const account = useAccount();
  const ownerId = isSignedIn ? user?.id ?? null : null;
  const [observedOwner, setObservedOwner] = useState(ownerId);
  const { notifications, markAsRead, markAllAsRead, clearAll, removeNotification, getUnreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const returnTo = useRef<string | null>(null);
  if (observedOwner !== ownerId) {
    setObservedOwner(ownerId);
    setOpen(false);
    setOpenedId(null);
  }
  if (disabled && (open || openedId)) {
    setOpen(false);
    setOpenedId(null);
  }
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const detailTitleId = `${baseId}-detail`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasAchievements = notifications.some((notification) => notification.type === "achievement");
  const accountReady = account.status === "ready" && observedOwner === ownerId && isSignedIn && user;
  const earned = useQuery(api.achievements.getUserAchievements, accountReady && open && hasAchievements ? { clerkId: user.id } : "skip");
  const ladders = useMemo(() => laddersWith(earned, earnedFromHistory(notifications)), [earned, notifications]);
  const unreadCount = disabled ? 0 : getUnreadCount();
  const opened = notifications.find((notification) => notification.id === openedId);
  const openedLevel = opened?.type === "achievement" ? findLevel(ladders, opened.metadata?.achievementId) : undefined;
  const detail = opened && openedLevel ? { notification: opened, level: openedLevel } : null;

  const showingDetail = detail !== null;
  useEffect(() => {
    // Back from an opened card: focus returns to that card in the list.
    if (showingDetail || !returnTo.current) return;
    document.getElementById(returnTo.current)?.focus({ preventScroll: true });
    returnTo.current = null;
  }, [showingDetail]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setOpenedId(null);
  };
  const focusHeading = () => headingRef.current?.focus();
  const activate = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.type === "achievement" && findLevel(ladders, notification.metadata?.achievementId)) {
      setOpenedId(notification.id);
      return;
    }
    const link = safeActionUrl(notification.metadata?.actionUrl);
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
    changeOpen(false);
  };
  const back = () => {
    if (opened) returnTo.current = itemDomId(baseId, opened);
    setOpenedId(null);
  };
  const remove = (notification: Notification) => {
    removeNotification(notification.id);
    focusHeading();
  };

  if (disabled) {
    const label = available ? "Sign in to view notifications" : "Notifications unavailable in guest mode";
    return <button type="button" className={cn("inline-flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground", className)} disabled aria-label={label} title={label}><BellIcon className="size-5" aria-hidden="true" /></button>;
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative size-10", className)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} title="Notifications">
          <BellIcon className="size-5" aria-hidden="true" />
          {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        aria-labelledby={detail ? detailTitleId : headingId}
        onOpenAutoFocus={(event) => { event.preventDefault(); focusHeading(); }}
        onEscapeKeyDown={(event) => { if (detail) { event.preventDefault(); back(); } }}
        className={cn("@container flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl p-0 shadow-xl transition-[width] duration-200", detail ? "w-[42rem]" : "w-[24rem]")}
      >
        {detail ? (
          <AchievementNoticeDetail notification={detail.notification} level={detail.level} titleId={detailTitleId} onBack={back} onLeave={() => changeOpen(false)} />
        ) : (
          <>
            <header className="flex flex-col gap-1 border-b border-border/60 py-2 pl-4 pr-2">
              <div className="flex items-center justify-between gap-2">
                <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold outline-none">
                  <span id={headingId}>Notifications</span>
                  {unreadCount > 0 && <span className="whitespace-nowrap rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-bold text-primary-foreground">{unreadCount} new</span>}
                </h2>
                <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => changeOpen(false)} aria-label="Close notifications"><XIcon className="size-4" aria-hidden="true" /></Button>
              </div>
              {notifications.length > 0 && (
                <div className="-ml-2.5 flex flex-wrap items-center gap-1">
                  <button type="button" className={pill} disabled={!unreadCount} onClick={() => { markAllAsRead(); focusHeading(); }}>
                    <ChecksIcon className="size-3.5" aria-hidden="true" />Mark all read
                  </button>
                  <button type="button" className={pill} onClick={() => { clearAll(); focusHeading(); }}>
                    <TrashIcon className="size-3.5" aria-hidden="true" />Clear all
                  </button>
                </div>
              )}
            </header>
            {notifications.length === 0 ? <EmptyNotifications /> : (
              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-3 [&>*]:shrink-0">
                {groupByDay(notifications).map((day) => (
                  <section key={day.label} aria-label={day.label} className="flex flex-col gap-2">
                    <SectionLabel>{day.label}</SectionLabel>
                    <ul className="flex flex-col gap-2">
                      {day.notifications.map((notification) => {
                        const level = notification.type === "achievement" ? findLevel(ladders, notification.metadata?.achievementId) : undefined;
                        const props = { notification, domId: itemDomId(baseId, notification), onOpen: () => activate(notification), onRemove: () => remove(notification) };
                        return level ? <AchievementItem key={notification.id} level={level} {...props} /> : <NoticeItem key={notification.id} {...props} />;
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
