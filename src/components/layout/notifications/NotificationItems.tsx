import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowSquareOutIcon, BellSimpleSlashIcon, InfoIcon, WarningIcon, WrenchIcon, XCircleIcon, XIcon, type Icon,
} from "@phosphor-icons/react";
import { CollectorCard } from "@/components/achievements/AchievementCards";
import { useStepStyle, type LadderLevel } from "@/components/achievements/achievement-levels";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import { getRelativeTime, type Notification, type NotificationType } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import { cardLayoutId, notificationLabel, safeActionUrl } from "./notification-groups";

const KIND_LOOK: Record<Exclude<NotificationType, "achievement">, { Icon: Icon; tile: string }> = {
  info: { Icon: InfoIcon, tile: "bg-primary/15 text-primary" },
  maintenance: { Icon: WrenchIcon, tile: "bg-warning/15 text-warning" },
  warning: { Icon: WarningIcon, tile: "bg-warning/15 text-warning" },
  error: { Icon: XCircleIcon, tile: "bg-destructive/15 text-destructive" },
};

export function UnreadDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full bg-primary", className)} />;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground", className)}>{children}</span>;
}

function RemoveButton({ notification, onRemove, className }: { notification: Notification; onRemove: () => void; className?: string }) {
  return (
    <button type="button" onClick={onRemove} aria-label={`Remove notification: ${notification.title}`}
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", className)}>
      <XIcon className="size-4" aria-hidden="true" />
    </button>
  );
}

/** An earned achievement as a wide collector card; opening it grows into the full card. */
export function AchievementItem({ notification, level, domId, onOpen, onRemove }: {
  notification: Notification;
  level: LadderLevel;
  domId: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const style = useStepStyle();
  return (
    <li className="relative" style={style(level.step)}>
      <motion.button id={domId} layoutId={cardLayoutId(notification)} transition={PROFILE_SPRING} type="button" onClick={onOpen}
        aria-label={`${notificationLabel(notification)}. Open achievement`} data-notification-id={notification.id}
        whileHover={{ y: -2 }} className="relative block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <CollectorCard ladder={level.ladder} step={level.step} variant="banner" bodyClassName="pr-9" className={cn(notification.read && "shadow-none")} />
      </motion.button>
      {!notification.read && <UnreadDot className="absolute -left-1 -top-1 size-3 ring-2 ring-popover" />}
      <RemoveButton notification={notification} onRemove={onRemove}
        className="absolute right-1 top-1 size-7 text-[var(--achievement-muted)] hover:bg-black/15 hover:text-[var(--achievement-foreground)]" />
    </li>
  );
}

/** Any other notification: a tile, the text and when, plus a link out when it carries a safe one. */
export function NoticeItem({ notification, domId, onOpen, onRemove }: {
  notification: Notification;
  domId: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const look = KIND_LOOK[notification.type === "achievement" ? "info" : notification.type];
  const link = safeActionUrl(notification.metadata?.actionUrl);
  return (
    <li className={cn("flex items-start gap-1 rounded-2xl transition-colors hover:bg-accent/60", !notification.read && "bg-accent/40")}>
      <button type="button" id={domId} onClick={onOpen} aria-label={notificationLabel(notification)} data-notification-id={notification.id}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring">
        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", look.tile)}>
          <look.Icon weight="fill" className="size-[50%]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 break-words text-sm font-medium">
            <span className="min-w-0">{notification.title}</span>
            {!notification.read && <UnreadDot />}
            {link && <ArrowSquareOutIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </span>
          {notification.description && <span className="break-words text-xs text-muted-foreground">{notification.description}</span>}
          <span className="text-[0.65rem] text-muted-foreground/80">{getRelativeTime(notification.timestamp)}</span>
        </span>
      </button>
      <RemoveButton notification={notification} onRemove={onRemove} className="mr-1 mt-1.5" />
    </li>
  );
}

export function EmptyNotifications() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={PROFILE_SPRING} className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        <BellSimpleSlashIcon weight="regular" className="size-8" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">No notifications yet</span>
        <span className="text-xs text-muted-foreground">New achievements and updates will show up here.</span>
      </span>
    </motion.div>
  );
}
