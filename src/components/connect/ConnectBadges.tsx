import { useId } from "react";
import { motion } from "framer-motion";
import { CheckIcon, CoffeeIcon } from "@phosphor-icons/react";
import type { ConnectRoomStatus, ConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

/** The room code as big letter tiles that flip in one after another. */
export function CodeTiles({ code, big = false, className }: { code: string; big?: boolean; className?: string }) {
  return (
    <span className={cn("flex [perspective:600px]", big ? "gap-3 sm:gap-6" : "gap-2", className)} aria-label={`Room code ${code.split("").join(" ")}`} role="img">
      {code.split("").map((char, index) => (
        <motion.span key={`${index}-${char}`} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ ...CONNECT_SPRING, delay: 0.08 * index }}
          className={cn("flex items-center justify-center border-2 border-primary/30 bg-primary/10 font-black text-primary shadow-[inset_0_-4px_0_color-mix(in_srgb,var(--primary)_25%,transparent)]",
            big ? "h-28 w-20 rounded-3xl text-7xl sm:h-48 sm:w-36 sm:text-9xl" : "h-16 w-13 rounded-2xl text-4xl")}>
          {char}
        </motion.span>
      ))}
    </span>
  );
}

const STATUS: Record<ConnectRoomStatus, [string, string]> = {
  lobby: ["Not started", "bg-muted text-muted-foreground"],
  running: ["Live", "bg-success/15 text-success"],
  paused: ["Paused", "bg-warning/15 text-warning"],
  complete: ["All done", "bg-primary/15 text-primary"],
};

export function StatusBadge({ status, className }: { status: ConnectRoomStatus; className?: string }) {
  const [label, tone] = STATUS[status];
  return (
    <motion.span layout transition={CONNECT_SPRING} className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold", tone, className)}>
      {status === "running" && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-current" />}
      {label}
    </motion.span>
  );
}

/**
 * One segment per test: filled when done, glowing when current. `index` is the current test;
 * `tests.length` means every test is done and -1 means none has started.
 */
export function TestDots({ tests, titles, index, label, className }: { tests: ConnectTest[]; titles: string[]; index: number; label?: string; className?: string }) {
  const id = useId();
  const total = tests.length;
  const ariaLabel = label ?? (index >= total ? `All ${total} tests done` : `Test ${Math.max(1, index + 1)} of ${total}`);
  return (
    <ol aria-label={ariaLabel} className={cn("flex w-full gap-1", className)}>
      {tests.map((test, position) => {
        const phase = position < index ? "done" : position === index ? "current" : "upcoming";
        return (
          <li key={test.id} data-segment={phase} title={titles[position] ? `Test ${position + 1}: ${titles[position]}` : undefined}
            className={cn("relative h-2 min-w-1 flex-1 overflow-hidden rounded-full", test.mode === "break" ? "bg-foreground/5" : "bg-foreground/10")}>
            {phase === "done" && <span className="absolute inset-0 bg-success" />}
            {phase === "current" && <motion.span layoutId={`test-dots-${id}`} transition={CONNECT_SPRING} className="absolute inset-0 bg-primary" />}
            <span className="sr-only">{`Test ${position + 1} ${phase}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({ value, done, label, valueText, className }: { value: number; done?: boolean; label: string; valueText?: string; className?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-valuetext={valueText}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}>
      <motion.div initial={false} animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")} />
    </div>
  );
}

export function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return <span role="img" aria-label={online ? "Online" : "Offline"} className={cn("inline-block size-2.5 shrink-0 rounded-full", online ? "bg-success" : "border-2 border-muted-foreground", className)} />;
}

export type TestPhase = "done" | "current" | "upcoming";

/** A read-only test row for participants: number or tick, title, detail. */
export function TestRow({ test, title, detail, position, phase, highlightId, appearDelay }: {
  test: ConnectTest;
  title: string;
  detail: string;
  position: number;
  phase: TestPhase;
  highlightId: string;
  /** Slides the row in after this many seconds; omitted rows appear at once. */
  appearDelay?: number;
}) {
  return (
    <motion.li aria-current={phase === "current" ? "step" : undefined} data-phase={phase}
      initial={appearDelay === undefined ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...CONNECT_SPRING, delay: appearDelay ?? 0 }}
      className={cn("relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm", phase === "done" ? "text-muted-foreground" : "text-foreground")}>
      {phase === "current" && <motion.span layoutId={highlightId} transition={CONNECT_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-primary" />}
      <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        phase === "current" ? "bg-primary text-primary-foreground" : phase === "done" ? "bg-success text-background" : "bg-muted text-muted-foreground")}>
        {phase === "done" ? <CheckIcon className="size-3.5" aria-label="Done" /> : position + 1}
      </span>
      <span className="relative flex min-w-0 flex-1 items-center gap-1.5 truncate font-semibold">
        {test.mode === "break" && <CoffeeIcon className="size-4 shrink-0" aria-hidden="true" />}<span className="truncate">{title}</span>
      </span>
      <span className="relative shrink-0 text-xs text-muted-foreground">{detail}</span>
    </motion.li>
  );
}
