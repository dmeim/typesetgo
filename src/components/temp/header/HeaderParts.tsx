import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellIcon, CheckIcon, FireIcon, MoonIcon, SignInIcon, SignOutIcon, SparkleIcon, SunIcon, TrophyIcon, UserCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { MOCK_ACCOUNT, PROFILE_LINKS, type MockNotification } from "./header-mock";
import { iconButton, unreadOf } from "./header-utils";

export function Logo({ variant, onHome, className }: { variant: "icon" | "banner"; onHome: () => void; className?: string }) {
  return (
    <button type="button" onClick={onHome} aria-label="TypeSetGo home" className={cn("shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {variant === "icon"
        ? <img src="/assets/Icon-Color.svg" alt="" className="size-9" />
        : <img src="/assets/Banner-Color.svg" alt="" className="h-auto w-36" />}
    </button>
  );
}

/** Sun and moon trade places with a quarter turn. */
export function ModeIcon({ dark, className = "size-5" }: { dark: boolean; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={dark ? "sun" : "moon"}
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
        transition={LAB_SPRING}
        className="flex"
      >
        {dark ? <SunIcon className={className} aria-hidden="true" /> : <MoonIcon className={className} aria-hidden="true" />}
      </motion.span>
    </AnimatePresence>
  );
}

export function ModeButton({ dark, onToggle, className }: { dark: boolean; onToggle: () => void; className?: string }) {
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button type="button" onClick={onToggle} aria-label={label} title={label} className={cn(iconButton, className)}>
      <ModeIcon dark={dark} />
    </button>
  );
}

export function UnreadDot({ count, className }: { count: number; className?: string }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={LAB_SPRING}
          className={cn("absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-background", className)}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function BellButton({ notifications, expanded, onClick, className }: { notifications: MockNotification[]; expanded?: boolean; onClick: () => void; className?: string }) {
  const unread = unreadOf(notifications);
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={cn(iconButton, className)}>
      <BellIcon className="size-5" aria-hidden="true" />
      <UnreadDot count={unread} />
    </button>
  );
}

const KIND_ICONS = { achievement: TrophyIcon, streak: FireIcon, info: SparkleIcon };

export function NotificationList({ notifications, onReadAll }: { notifications: MockNotification[]; onReadAll: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-sm font-semibold">Notifications</span>
        <button type="button" onClick={onReadAll} disabled={!unreadOf(notifications)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
          <CheckIcon className="size-3.5" aria-hidden="true" />Mark all read
        </button>
      </div>
      {notifications.map(({ id, title, body, when, kind, unread }) => {
        const KindIcon = KIND_ICONS[kind];
        return (
          <div key={id} className="flex items-start gap-3 rounded-2xl px-2 py-2 hover:bg-accent/60">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <KindIcon className="size-4" weight="fill" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 text-sm font-medium">
                {title}
                {unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </span>
              <span className="text-xs text-muted-foreground">{body}</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground/80">{when}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Avatar({ signedIn, className = "size-8 text-sm" }: { signedIn: boolean; className?: string }) {
  if (!signedIn) {
    return (
      <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}>
        <UserCircleIcon className="size-[70%]" weight="regular" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_200deg,var(--primary),var(--accent-emphasis),var(--primary))] font-bold text-primary-foreground", className)}>
      {MOCK_ACCOUNT.username[0].toUpperCase()}
    </span>
  );
}

/** Profile now holds stats, history, achievements, theme and settings, so one menu replaces four buttons. */
export function AccountMenu({ signedIn, onPick }: { signedIn: boolean; onPick?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 px-2 pt-1">
        <Avatar signedIn={signedIn} className="size-10 text-base" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{signedIn ? MOCK_ACCOUNT.username : "Guest"}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {signedIn
              ? <><FireIcon className="size-3.5 text-warning" weight="fill" aria-hidden="true" />{MOCK_ACCOUNT.streak}-day streak</>
              : "Results stay on this device"}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PROFILE_LINKS.map(({ label, href, Icon }) => {
          const locked = !signedIn && (label === "Stats" || label === "History" || label === "Achievements");
          return (
            <Link key={label} to={href} onClick={onPick} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-accent", locked && "text-muted-foreground")}>
              <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
            </Link>
          );
        })}
      </div>
      <button type="button" className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", signedIn ? "text-muted-foreground hover:bg-accent hover:text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
        {signedIn ? <SignOutIcon className="size-4" aria-hidden="true" /> : <SignInIcon className="size-4" aria-hidden="true" />}
        {signedIn ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
}

/** A card that grows out of its button. Place it inside a `relative` wrapper. */
export function PopoverCard({ open, align = "right", className, children }: { open: boolean; align?: "left" | "right"; className?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -6 }}
          transition={LAB_SPRING}
          style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
          className={cn("absolute top-full z-50 mt-2 w-72 max-w-[calc(100cqw-1.5rem)] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl", align === "right" ? "right-0" : "left-0", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A small "Soon" chip for pages that are not open yet. */
export function SoonChip({ className }: { className?: string }) {
  return <span className={cn("rounded-full bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground", className)}>Soon</span>;
}
