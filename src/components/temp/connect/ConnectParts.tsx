import { useEffect, useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, type Icon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { describeConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { avatarTone, photoHue, type MockTest, type RoomStatus } from "./connect-mock";

const AVATAR_SIZES = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-14 text-xl" };

/**
 * A student's picture: signed-in players show their profile photo (drawn here as a stand-in for the account image);
 * guests get their first letter on a colour.
 */
export function KidAvatar({ name, photo = false, size = "md", className }: { name: string; photo?: boolean; size?: keyof typeof AVATAR_SIZES; className?: string }) {
  if (photo) {
    const hue = photoHue(name);
    return (
      <span aria-hidden="true" className={cn("flex shrink-0 overflow-hidden rounded-full", AVATAR_SIZES[size], className)}>
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill={`hsl(${hue} 55% 62%)`} />
          <circle cx="20" cy="16" r="7.5" fill={`hsl(${(hue + 25) % 360} 35% 88%)`} />
          <path d="M6 40c1.5-9 7.5-13 14-13s12.5 4 14 13z" fill={`hsl(${(hue + 180) % 360} 45% 38%)`} />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", avatarTone(name), AVATAR_SIZES[size], className)}>
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** A rounded card with an optional coloured icon tile, title and corner action. */
export function LabCard({ title, description, Icon, tile = "bg-primary text-primary-foreground", action, children, className, labelledBy, bare = false, hideHeader = false }: {
  title?: string;
  description?: ReactNode;
  Icon?: Icon;
  tile?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  /** Drops the card frame, for content that sits inside another card. */
  bare?: boolean;
  /** Keeps the heading for screen readers only, when something else on screen already names the card. */
  hideHeader?: boolean;
}) {
  const fallback = useId();
  const headingId = labelledBy ?? fallback;
  return (
    <motion.section layout="position" transition={LAB_SPRING} aria-labelledby={title ? headingId : undefined}
      className={cn("flex min-w-0 flex-col gap-4", !bare && "rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6", className)}>
      {title && (
        <header className={cn("flex items-start gap-3", hideHeader && "sr-only")}>
          {Icon && <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", tile)}><Icon weight="fill" className="size-5" /></span>}
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-lg font-bold leading-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** A pill of choices with a sliding highlight. */
export function Pills<T extends string>({ label, value, options, onChange, disabled, size = "md", className }: {
  label: string;
  value: T;
  /** `short` replaces the label on phones. */
  options: { value: T; label: string; short?: string; Icon?: Icon }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-muted/60 p-1", disabled && "opacity-60", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button key={option.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(option.value)}
            className={cn("relative flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full transition-colors",
              size === "lg" ? "px-3 py-3 text-sm font-bold sm:px-5 sm:text-base" : "px-2 py-2 text-sm font-medium sm:px-4",
              "focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
              selected ? "text-primary-foreground" : "text-muted-foreground enabled:hover:text-foreground")}>
            {selected && <motion.span layoutId={`pill-${id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
            {option.Icon && <option.Icon weight={selected ? "fill" : "bold"} className={cn("relative shrink-0", size === "lg" ? "size-5" : "size-4")} aria-hidden="true" />}
            {option.short ? (
              <span className="relative truncate"><span className="sm:hidden">{option.short}</span><span className="hidden sm:inline">{option.label}</span></span>
            ) : <span className="relative truncate">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** The room code as big letter tiles that flip in one after another. */
export function CodeTiles({ code, big = false, className }: { code: string; big?: boolean; className?: string }) {
  return (
    <span className={cn("flex [perspective:600px]", big ? "gap-3 sm:gap-6" : "gap-2", className)} aria-label={`Room code ${code.split("").join(" ")}`} role="img">
      {code.split("").map((char, index) => (
        <motion.span key={`${index}-${char}`} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ ...LAB_SPRING, delay: 0.08 * index }}
          className={cn("flex items-center justify-center border-2 border-primary/30 bg-primary/10 font-black text-primary shadow-[inset_0_-4px_0_color-mix(in_srgb,var(--primary)_25%,transparent)]",
            big ? "h-28 w-20 rounded-3xl text-7xl sm:h-48 sm:w-36 sm:text-9xl" : "h-16 w-13 rounded-2xl text-4xl")}>
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export function ProgressBar({ value, done, label, className }: { value: number; done?: boolean; label: string; className?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}>
      <motion.div initial={false} animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")} />
    </div>
  );
}

export function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return <span role="img" aria-label={online ? "Online" : "Offline"} className={cn("inline-block size-2.5 shrink-0 rounded-full", online ? "bg-success" : "border-2 border-muted-foreground", className)} />;
}

const STATUS: Record<RoomStatus, [string, string]> = {
  lobby: ["Not started", "bg-muted text-muted-foreground"],
  running: ["Live", "bg-success/15 text-success"],
  paused: ["Paused", "bg-warning/15 text-warning"],
  complete: ["All done", "bg-primary/15 text-primary"],
};

export function StatusBadge({ status }: { status: RoomStatus }) {
  const [label, tone] = STATUS[status];
  return (
    <motion.span layout transition={LAB_SPRING} className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold", tone)}>
      {status === "running" && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-current" />}
      {label}
    </motion.span>
  );
}

/** One segment per test: filled when done, glowing when current. */
export function TestDots({ tests, titles, index, className }: { tests: MockTest[]; titles: string[]; index: number; className?: string }) {
  const id = useId();
  return (
    <ol aria-label={`Test ${Math.min(index + 1, tests.length)} of ${tests.length}`} className={cn("flex w-full gap-1", className)}>
      {tests.map((test, position) => (
        <li key={test.id} title={titles[position]} className={cn("relative h-2 flex-1 overflow-hidden rounded-full", test.mode === "break" ? "bg-foreground/5" : "bg-foreground/10")}>
          {position < index && <span className="absolute inset-0 bg-success" />}
          {position === index && <motion.span layoutId={`test-dots-${id}`} transition={LAB_SPRING} className="absolute inset-0 bg-primary" />}
        </li>
      ))}
    </ol>
  );
}

/** A read-only test row for participants: number or tick, title, detail. */
export function TestRow({ test, title, position, phase, highlightId }: { test: MockTest; title: string; position: number; phase: "done" | "current" | "upcoming"; highlightId: string }) {
  return (
    <li aria-current={phase === "current" ? "step" : undefined}
      className={cn("relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm", phase === "done" ? "text-muted-foreground" : "text-foreground")}>
      {phase === "current" && <motion.span layoutId={highlightId} transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-primary" />}
      <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        phase === "current" ? "bg-primary text-primary-foreground" : phase === "done" ? "bg-success text-background" : "bg-muted text-muted-foreground")}>
        {phase === "done" ? <CheckIcon className="size-3.5" aria-label="Done" /> : position + 1}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center gap-1.5 truncate font-semibold">
        {test.mode === "break" && <CoffeeIcon className="size-4 shrink-0" aria-hidden="true" />}<span className="truncate">{title}</span>
      </span>
      <span className="relative shrink-0 text-xs text-muted-foreground">{describeConnectTest(test)}</span>
    </li>
  );
}

/** A button that asks "tap again" before acting, so a stray click never ends or resets anything. */
export function TwoTapButton({ label, confirmLabel, Icon, onConfirm, tone = "destructive", className }: {
  label: string;
  confirmLabel: string;
  Icon: Icon;
  onConfirm: () => void;
  tone?: "destructive" | "warning";
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <motion.button layout type="button" transition={LAB_SPRING} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}
      className={cn("flex h-10 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring",
        armed ? (tone === "destructive" ? "bg-destructive text-background" : "bg-warning text-background") : "text-muted-foreground hover:bg-accent hover:text-foreground", className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={armed ? "sure" : "idle"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={LAB_SPRING} aria-live="polite">
          {armed ? confirmLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
