import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowClockwiseIcon, BellSimpleSlashIcon, ChecksIcon, FireIcon, MegaphoneIcon, TrashIcon, TrendUpIcon, UsersThreeIcon, type Icon,
} from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { useStepStyle } from "./notice-utils";
import { achievementOf, type MockNotice, type NoticeKind } from "./notifications-mock";
import type { MockInbox } from "./use-mock-inbox";

const KIND_LOOK: Record<Exclude<NoticeKind, "achievement">, { Icon: Icon; tile: string }> = {
  streak: { Icon: FireIcon, tile: "bg-warning/15 text-warning" },
  best: { Icon: TrendUpIcon, tile: "bg-success/15 text-success" },
  room: { Icon: UsersThreeIcon, tile: "bg-(--accent-emphasis)/15 text-(--accent-emphasis)" },
  system: { Icon: MegaphoneIcon, tile: "bg-primary/15 text-primary" },
};

/** The square icon for a notice. Achievements use their tier colours and icon. */
export function KindTile({ notice, className = "size-9 rounded-xl" }: { notice: MockNotice; className?: string }) {
  const style = useStepStyle();
  const found = achievementOf(notice);
  if (found) {
    return (
      <span aria-hidden="true" style={style(found.step)} className={cn("flex shrink-0 items-center justify-center border-2 border-[var(--achievement-border)] bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]", className)}>
        <AchievementIcon icon={found.step.achievement.icon} className="size-[55%]" />
      </span>
    );
  }
  const look = KIND_LOOK[notice.kind as Exclude<NoticeKind, "achievement">];
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", look.tile, className)}>
      <look.Icon weight="fill" className="size-[50%]" />
    </span>
  );
}

export function UnreadDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full bg-primary", className)} />;
}

const pill = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";

/** Mark all read and clear, as small pills. */
export function InboxActions({ inbox, className }: { inbox: MockInbox; className?: string }) {
  if (!inbox.notices.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <button type="button" onClick={inbox.readAll} disabled={!inbox.unread} className={pill}>
        <ChecksIcon className="size-3.5" aria-hidden="true" />Mark all read
      </button>
      <button type="button" onClick={inbox.clear} className={pill}>
        <TrashIcon className="size-3.5" aria-hidden="true" />Clear
      </button>
    </div>
  );
}

/** Shown once the inbox is cleared; brings the examples back for the demo. */
export function EmptyInbox({ inbox, title = "You're all caught up", className }: { inbox: MockInbox; title?: string; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={LAB_SPRING} className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span className="relative flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        <BellSimpleSlashIcon weight="regular" className="size-8" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">New achievements, streaks, bests and room invites will show up here.</span>
      </span>
      <button type="button" onClick={inbox.reset} className={cn(pill, "bg-muted")}>
        <ArrowClockwiseIcon className="size-3.5" aria-hidden="true" />Bring back the examples
      </button>
    </motion.div>
  );
}

/** A dimmed layer that covers the stage below the dock; a press on it closes whatever sits above. */
export function StageScrim({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className={cn("absolute inset-0 z-30 bg-background/60 backdrop-blur-[2px]", className)}
    />
  );
}

/** The extra lines a non-achievement notice shows when opened. */
export function NoticeExtra({ notice }: { notice: MockNotice }) {
  const { detail } = notice;
  if (notice.kind === "streak" && detail?.days) {
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    return (
      <div className="flex flex-wrap items-center gap-1.5" role="img" aria-label="7 days in a row, today still to go">
        {detail.days.map((done, index) => (
          <span key={index} className={cn("flex size-7 items-center justify-center rounded-full text-[0.6rem] font-bold", done ? "bg-warning text-background" : "bg-muted text-muted-foreground")}>{labels[index]}</span>
        ))}
        <span className="flex size-7 items-center justify-center rounded-full border-2 border-dashed border-warning text-warning">
          <FireIcon weight="fill" className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    );
  }
  if (notice.kind === "best" && detail?.from !== undefined && detail.to !== undefined) {
    return (
      <div className="flex flex-col gap-1.5" role="img" aria-label={`Old best ${detail.from} WPM, new best ${detail.to} WPM`}>
        {[["Old best", detail.from, "bg-muted-foreground/40"], ["New best", detail.to, "bg-success"]].map(([label, value, bar]) => (
          <span key={label} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 whitespace-nowrap text-muted-foreground">{label}</span>
            <motion.span initial={{ width: 0 }} animate={{ width: `${(Number(value) / 80) * 100}%` }} transition={{ duration: 0.5 }} className={cn("h-2 rounded-full", bar)} />
            <span className="shrink-0 font-semibold tabular-nums">{value}</span>
          </span>
        ))}
      </div>
    );
  }
  if (notice.kind === "room" && detail?.code) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-muted px-2 py-1 font-mono text-sm font-semibold tracking-[0.2em]">{detail.code}</span>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <UsersThreeIcon className="size-3.5" aria-hidden="true" />Join room
        </button>
      </div>
    );
  }
  return null;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground", className)}>{children}</span>;
}
