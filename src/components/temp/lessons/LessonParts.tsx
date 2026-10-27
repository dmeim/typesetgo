import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, GraduationCapIcon, HourglassIcon, KeyboardIcon, LockSimpleIcon, PlayIcon, StarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { COURSE_MINUTES, LESSON_COUNT, UNITS, type LessonStatus, type Unit } from "./lessons-mock";

/** Three stars; filled ones show what was earned. */
export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span role="img" aria-label={`${count} of 3 stars`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[0, 1, 2].map((index) => (
        <StarIcon key={index} weight="fill" aria-hidden="true" className={cn("size-[1em]", index < count ? "text-warning" : "text-muted-foreground/25")} />
      ))}
    </span>
  );
}

const STATUS: Record<LessonStatus, { label: string; className: string; Icon: typeof CheckIcon }> = {
  done: { label: "Done", className: "bg-success/15 text-success", Icon: CheckIcon },
  current: { label: "Up next", className: "bg-primary text-primary-foreground", Icon: PlayIcon },
  locked: { label: "Locked", className: "bg-foreground/10 text-muted-foreground", Icon: LockSimpleIcon },
  soon: { label: "Soon", className: "bg-accent text-accent-foreground", Icon: HourglassIcon },
};

export function StatusPill({ status, className }: { status: LessonStatus; className?: string }) {
  const { label, className: tone, Icon } = STATUS[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", tone, className)}>
      <Icon weight="bold" className="size-3" aria-hidden="true" />{label}
    </span>
  );
}

/** A small keycap; `tone` picks how loud it is. */
export function KeyCap({ char, tone = "plain", className }: { char: string; tone?: "plain" | "bold" | "faint"; className?: string }) {
  return (
    <kbd className={cn(
      "inline-flex min-w-[1.75em] items-center justify-center rounded-md border-b-2 px-1.5 py-0.5 font-mono text-[0.85em] font-semibold uppercase leading-tight",
      tone === "bold" && "border-primary/60 bg-primary/15 text-primary",
      tone === "plain" && "border-border bg-foreground/10 text-foreground",
      tone === "faint" && "border-border/60 bg-foreground/5 text-muted-foreground",
      className,
    )}>{char === " " ? "space" : char}</kbd>
  );
}

export function KeyRow({ keys, tone, className }: { keys: string; tone?: "plain" | "bold" | "faint"; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {keys.split("").map((char) => <KeyCap key={char} char={char} tone={tone} />)}
    </span>
  );
}

export function UnitTile({ unit, size = "md" }: { unit: Unit; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center", unit.tile, size === "sm" && "size-7 rounded-lg", size === "md" && "size-10 rounded-xl", size === "lg" && "size-14 rounded-2xl")}>
      <unit.Icon weight="fill" aria-hidden="true" className={cn(size === "sm" && "size-4", size === "md" && "size-5", size === "lg" && "size-8")} />
    </span>
  );
}

/** Back to the practice page: lessons are optional and practice always works. */
export function PracticeLink({ children = "Practice typing now", quiet = false, className }: { children?: ReactNode; quiet?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        quiet ? "border border-border bg-card text-foreground hover:bg-accent" : "bg-primary text-primary-foreground hover:brightness-110",
        className,
      )}
    >
      <KeyboardIcon className="size-4 shrink-0" aria-hidden="true" />{children}
    </Link>
  );
}

/** How the page reads today: lessons are not open yet, so practice is the way in. */
export function ComingSoonBanner({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn("@container", className)}>
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 @2xl:flex-row @2xl:items-center @2xl:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-primary/10" />
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCapIcon weight="fill" className="size-8" aria-hidden="true" />
        </span>
        <div className="relative flex min-w-0 flex-1 flex-col gap-1">
          <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-accent-foreground">Coming soon</span>
          <h2 className="text-lg font-bold leading-tight @2xl:text-xl">Lessons are on the way</h2>
          <p className="text-sm text-muted-foreground">
            {children ?? <>Here is a peek at the course: {UNITS.length} units, {LESSON_COUNT} short lessons, about {Math.round(COURSE_MINUTES / 60 * 2) / 2} hours in all. Until it opens, keep practising.</>}
          </p>
        </div>
        <PracticeLink className="relative shrink-0" />
      </div>
    </div>
  );
}

/** A thin progress bar. */
export function Bar({ value, max, className, fill = "bg-primary" }: { value: number; max: number; className?: string; fill?: string }) {
  return (
    <span className={cn("block h-2 overflow-hidden rounded-full bg-foreground/10", className)} aria-hidden="true">
      <span className={cn("block h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </span>
  );
}

/** A small ring for unit progress. */
export function Ring({ value, max, className, children }: { value: number; max: number; className?: string; children?: ReactNode }) {
  const radius = 16;
  const length = 2 * Math.PI * radius;
  return (
    <span className={cn("relative inline-flex size-12 shrink-0 items-center justify-center", className)}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-foreground/10" />
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-current transition-[stroke-dashoffset] duration-500"
          strokeDasharray={length} strokeDashoffset={length - (max ? value / max : 0) * length} />
      </svg>
      <span className="relative text-[0.7rem] font-bold text-foreground">{children}</span>
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold @lg:text-3xl">{title}</h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
