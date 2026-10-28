import { CheckIcon, CoffeeIcon, HourglassMediumIcon, PauseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { ConnectTest } from "@/lib/connect-types";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";
import type { BoardStatus } from "@/components/connect/board/board-model";

const STATUS_TONE: Partial<Record<BoardStatus, string>> = {
  typing: "text-primary",
  finished: "text-success",
  done: "text-success",
  late: "text-warning",
  paused: "text-warning",
};

const STATUS_ICON: Partial<Record<BoardStatus, typeof CheckIcon>> = {
  break: CoffeeIcon, late: HourglassMediumIcon, offline: WifiSlashIcon, left: WifiSlashIcon, paused: PauseIcon, finished: CheckIcon, done: CheckIcon,
};

/** Icon and words for the player's state; while typing, how far through the test they are ("108/200 words"). */
export function StatusLine({ status, text, className }: { status: BoardStatus; text: string; className?: string }) {
  const StatusIcon = STATUS_ICON[status];
  return (
    <span className={cn("flex min-w-0 items-center gap-[0.3em] font-semibold tabular-nums", STATUS_TONE[status] ?? "text-muted-foreground", className)}>
      {StatusIcon && <StatusIcon weight="bold" className="size-[1.1em] shrink-0" aria-hidden="true" />}
      <span className="truncate">{status === "typing" && <span className="sr-only">Typing, </span>}{text}</span>
    </span>
  );
}

/**
 * The player's name, shrunk (to two thirds at most) so long names fit instead of being cut to a few letters.
 * `reserve` is the em width the rest of the row takes; the card must be a size container (`@container`).
 * The line's height is fixed, so every card is the same height whatever the name, which Fit relies on.
 */
export function CardName({ name, size, reserve, className }: { name: string; size: number; reserve: number; className?: string }) {
  const letters = Math.max(4, Array.from(name).length);
  const fontSize = `max(${(size * 0.66).toFixed(2)}em, min(${size}em, calc((100cqw - ${reserve}em) / ${(letters * 0.62).toFixed(2)})))`;
  return (
    <span className={cn("flex min-w-0 items-center", className)} style={{ height: `${size * 1.25}em` }}>
      <h3 className="min-w-0 truncate font-extrabold leading-tight" style={{ fontSize }} title={name}>{name}</h3>
    </span>
  );
}

/** Speed that counts up as it changes; a dash before any typing. */
export function CardWpm({ value, title, className }: { value: number; title?: string; className?: string }) {
  const shown = useAnimatedCounter(value, 500);
  return <span className={cn("font-black leading-none tabular-nums", className)} title={title}>{value > 0 ? shown : "–"}</span>;
}

/** One em-sized segment per test for self-paced rooms: green when done, primary for the current one. */
export function TestPips({ tests, titles, index, className }: { tests: ConnectTest[]; titles: string[]; index: number; className?: string }) {
  const label = index >= tests.length ? `All ${tests.length} tests done` : `Test ${index + 1} of ${tests.length}: ${titles[index] ?? ""}`;
  return (
    <ol aria-label={label} className={cn("flex h-[0.35em] gap-[0.2em]", className)}>
      {tests.map((test, position) => (
        <li key={test.id} data-segment={position < index ? "done" : position === index ? "current" : "upcoming"}
          title={titles[position] ? `Test ${position + 1}: ${titles[position]}` : undefined}
          className={cn("min-w-[0.3em] flex-1 rounded-full transition-colors duration-500",
            position < index ? "bg-success" : position === index ? "bg-primary" : test.mode === "break" ? "bg-foreground/5" : "bg-foreground/12")} />
      ))}
    </ol>
  );
}
