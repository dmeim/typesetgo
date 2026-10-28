import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, CrownSimpleIcon, HourglassMediumIcon, PauseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { BoardStatus } from "@/components/connect/board/board-model";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";
import type { CardView, SimTest } from "./board-cards-mock";
import { barTone, GOLD, STATUS_TONE } from "./card-tone";

const STATUS_ICON: Partial<Record<BoardStatus, typeof CheckIcon>> = {
  break: CoffeeIcon, late: HourglassMediumIcon, offline: WifiSlashIcon, left: WifiSlashIcon, paused: PauseIcon, finished: CheckIcon, done: CheckIcon,
};

/** Icon and words for the player's state, e.g. "108/200 words" or "Break 0:12". */
export function StatusText({ player, className, iconless = false }: { player: CardView; className?: string; iconless?: boolean }) {
  const StatusIcon = STATUS_ICON[player.status];
  return (
    <span className={cn("flex min-w-0 items-center gap-[0.3em] font-semibold tabular-nums", STATUS_TONE[player.status] ?? "text-muted-foreground", className)}>
      {StatusIcon && !iconless && <StatusIcon weight="bold" className="size-[1.1em] shrink-0" aria-hidden="true" />}
      <span className="truncate">{player.statusText}</span>
    </span>
  );
}

export function Crown({ show, className }: { show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span initial={{ y: 6, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0, scale: 0.5 }} transition={CONNECT_SPRING}
          className={cn("pointer-events-none absolute flex", className)} style={{ color: GOLD }}>
          <CrownSimpleIcon weight="fill" className="size-full drop-shadow" aria-label="Fastest right now" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function DoneCheck({ show, className }: { show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className={cn("absolute flex items-center justify-center rounded-full bg-success text-background ring-[0.12em] ring-card", className)}>
          <CheckIcon weight="bold" className="size-[62%]" aria-label="Finished" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Avatar with the crown above-left and the finished check below-right, like the real card. */
export function CardAvatar({ player, className, style, crown = true }: { player: CardView; className?: string; style?: CSSProperties; crown?: boolean }) {
  return (
    <span className={cn("relative block shrink-0", className)} style={style}>
      <ConnectAvatar name={player.name} avatarUrl={player.picture} className={cn("size-full text-[1em]", player.away && "opacity-40")} />
      <Crown show={crown && player.leader} className="-left-[22%] -top-[44%] size-[64%] -rotate-12" />
      <DoneCheck show={player.finished} className="-bottom-[8%] -right-[8%] size-[44%]" />
    </span>
  );
}

/**
 * The player's name, shrunk (down to two thirds) so long names fit the card instead of being cut to a few letters.
 * Assumes monospace-wide letters, so proportional fonts end up a little smaller than needed, never cut sooner.
 * `reserve` is the em width the rest of the row takes; the card must be a size container (`@container`).
 */
export function CardName({ name, size, reserve, className }: { name: string; size: number; reserve: number; className?: string }) {
  const letters = Math.max(4, Array.from(name).length);
  const fontSize = `max(${(size * 0.66).toFixed(2)}em, min(${size}em, calc((100cqw - ${reserve}em) / ${(letters * 0.62).toFixed(2)})))`;
  return (
    // A fixed-height line keeps every card the same height whatever the name's size.
    <span className={cn("flex min-w-0 items-center", className)} style={{ height: `${size * 1.25}em` }}>
      <h3 className="min-w-0 truncate font-extrabold leading-tight" style={{ fontSize }} title={name}>{name}</h3>
    </span>
  );
}

/** Speed that counts up as it changes; a dash before any typing. */
export function Wpm({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedCounter(value, 500);
  return <span className={cn("font-black leading-none tabular-nums", className)}>{value > 0 ? shown : "–"}</span>;
}

/** One em-sized segment per test: green when done, primary for the current one. */
export function TestPips({ tests, step, className }: { tests: SimTest[]; step: number; className?: string }) {
  const label = step >= tests.length ? `All ${tests.length} tests done` : `Test ${step + 1} of ${tests.length}: ${tests[step].title}`;
  return (
    <ol aria-label={label} className={cn("flex h-[0.35em] gap-[0.2em]", className)}>
      {tests.map((test, index) => (
        <li key={test.id} title={`Test ${index + 1}: ${test.title}`}
          className={cn("min-w-[0.3em] flex-1 rounded-full transition-colors duration-500",
            index < step ? "bg-success" : index === step ? "bg-primary" : test.kind === "break" ? "bg-foreground/5" : "bg-foreground/12")} />
      ))}
    </ol>
  );
}

/** A thin bar; em-sized through `className`. */
export function Bar({ player, className }: { player: CardView; className?: string }) {
  return (
    <div role="progressbar" aria-label={`${player.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(player.percent)} aria-valuetext={player.statusText}
      className={cn("overflow-hidden bg-foreground/10", className)}>
      <motion.div initial={false} animate={{ width: `${player.percent}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("h-full rounded-[inherit]", barTone(player))} />
    </div>
  );
}

export function PresenceDot({ player, className }: { player: CardView; className?: string }) {
  return (
    <span role="img" aria-label={player.away ? "Offline" : "Online"}
      className={cn("inline-block size-[0.55em] shrink-0 rounded-full", player.away ? "border-[0.12em] border-muted-foreground" : "bg-success", className)} />
  );
}
