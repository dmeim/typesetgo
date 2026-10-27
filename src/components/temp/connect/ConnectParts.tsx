import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, type Icon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { avatarTone, testDetail, type MockTest, type RoomStatus } from "./connect-mock";

const AVATAR_SIZES = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-14 text-xl" };

export function KidAvatar({ name, size = "md", className }: { name: string; size?: keyof typeof AVATAR_SIZES; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", avatarTone(name), AVATAR_SIZES[size], className)}>
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** A rounded card with an optional coloured icon tile, title and corner action. */
export function LabCard({ title, description, Icon, tile = "bg-primary text-primary-foreground", action, children, className, labelledBy }: {
  title?: string;
  description?: ReactNode;
  Icon?: Icon;
  tile?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const fallback = useId();
  const headingId = labelledBy ?? fallback;
  return (
    <motion.section layout="position" transition={LAB_SPRING} aria-labelledby={title ? headingId : undefined}
      className={cn("flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6", className)}>
      {title && (
        <header className="flex items-start gap-3">
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
export function Pills<T extends string>({ label, value, options, onChange, disabled, className }: {
  label: string;
  value: T;
  options: { value: T; label: string; Icon?: Icon }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-muted/60 p-1", disabled && "opacity-60", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button key={option.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(option.value)}
            className={cn("relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
              selected ? "text-primary-foreground" : "text-muted-foreground enabled:hover:text-foreground")}>
            {selected && <motion.span layoutId={`pill-${id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
            {option.Icon && <option.Icon weight={selected ? "fill" : "bold"} className="relative size-4" aria-hidden="true" />}
            <span className="relative">{option.label}</span>
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

export function PresenceDot({ online }: { online: boolean }) {
  return <span role="img" aria-label={online ? "Online" : "Offline"} className={cn("inline-block size-2.5 shrink-0 rounded-full", online ? "bg-success" : "border-2 border-muted-foreground")} />;
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
export function TestDots({ tests, index, className }: { tests: MockTest[]; index: number; className?: string }) {
  const id = useId();
  return (
    <ol aria-label={`Test ${Math.min(index + 1, tests.length)} of ${tests.length}`} className={cn("flex w-full gap-1", className)}>
      {tests.map((test, position) => (
        <li key={test.id} title={test.title} className={cn("relative h-2 flex-1 overflow-hidden rounded-full", test.mode === "break" ? "bg-foreground/5" : "bg-foreground/10")}>
          {position < index && <span className="absolute inset-0 bg-success" />}
          {position === index && <motion.span layoutId={`test-dots-${id}`} transition={LAB_SPRING} className="absolute inset-0 bg-primary" />}
        </li>
      ))}
    </ol>
  );
}

/** A read-only test row for participants: number or tick, title, detail. */
export function TestRow({ test, position, phase, highlightId }: { test: MockTest; position: number; phase: "done" | "current" | "upcoming"; highlightId: string }) {
  return (
    <li aria-current={phase === "current" ? "step" : undefined}
      className={cn("relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm", phase === "done" ? "text-muted-foreground" : "text-foreground")}>
      {phase === "current" && <motion.span layoutId={highlightId} transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-primary" />}
      <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        phase === "current" ? "bg-primary text-primary-foreground" : phase === "done" ? "bg-success text-background" : "bg-muted text-muted-foreground")}>
        {phase === "done" ? <CheckIcon className="size-3.5" aria-label="Done" /> : position + 1}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center gap-1.5 truncate font-semibold">
        {test.mode === "break" && <CoffeeIcon className="size-4 shrink-0" aria-hidden="true" />}{test.title}
      </span>
      <span className="relative shrink-0 text-xs text-muted-foreground">{testDetail(test)}</span>
    </li>
  );
}
