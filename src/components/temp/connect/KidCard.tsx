import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, CrownSimpleIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import type { Kid } from "./connect-mock";
import { KidAvatar, PresenceDot, ProgressBar, TestDots } from "./ConnectParts";
import { PHASE_LABELS, kidPhase, kidProgress, kidStats, type KidPhase } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const GOLD = "#d6a738";

function Big({ value, unit }: { value: number | null; unit: string }) {
  const shown = useAnimatedCounter(value ?? 0, 500);
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-4xl font-black leading-none tabular-nums">{value === null ? "–" : shown}</span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </span>
  );
}

function PhaseChip({ phase, progress }: { phase: KidPhase; progress: number }) {
  const tone = phase === "finished" || phase === "done" ? "bg-success/15 text-success" : phase === "typing" ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground";
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={phase} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={LAB_SPRING}
        className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", tone)}>
        {phase === "break" && <CoffeeIcon className="size-3.5" aria-hidden="true" />}
        {phase === "offline" && <WifiSlashIcon className="size-3.5" aria-hidden="true" />}
        {(phase === "finished" || phase === "done") && <CheckIcon className="size-3.5" aria-hidden="true" />}
        {phase === "typing" ? `${Math.round(progress)}%` : PHASE_LABELS[phase]}
      </motion.span>
    </AnimatePresence>
  );
}

/** One student on the live board. Cards slide to their new place when the order changes. */
export function KidCard({ room, kid, leader, layout }: { room: MockRoom; kid: Kid; leader: boolean; layout: "cards" | "list" }) {
  const phase = kidPhase(room, kid);
  const progress = kidProgress(room, kid);
  const stats = kidStats(room, kid);
  const finished = phase === "finished" || phase === "done";
  const showSteps = room.pacing === "participant" && room.status !== "lobby";
  const avatar = (
    <span className="relative shrink-0">
      <KidAvatar name={kid.name} size={layout === "cards" ? "md" : "sm"} className={cn(!kid.online && "opacity-40")} />
      <AnimatePresence>
        {finished && (
          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className={cn("absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-success text-background ring-2 ring-card", layout === "cards" ? "size-5" : "size-4")}>
            <CheckIcon weight="bold" className={layout === "cards" ? "size-3" : "size-2.5"} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {leader && (
          <motion.span initial={{ y: 6, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0, scale: 0.5 }} transition={LAB_SPRING}
            className="absolute -left-1.5 -top-3.5 -rotate-12" style={{ color: GOLD }}>
            <CrownSimpleIcon weight="fill" className="size-5 drop-shadow" aria-label="Fastest right now" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
  const name = (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-bold">{kid.name}</span>
      {kid.isYou && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-primary-foreground">You</span>}
      <PresenceDot online={kid.online} />
    </span>
  );
  const bar = <ProgressBar value={progress} done={finished} label={`${kid.name} progress`} />;
  const frame = cn("min-w-0 rounded-3xl border bg-card transition-colors",
    !kid.online ? "border-dashed border-border bg-muted/40 text-muted-foreground" : finished ? "border-success/60" : leader ? "border-[#d6a738]/60" : "border-border");

  return (
    <motion.li layout transition={LAB_SPRING} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={frame}>
      {layout === "cards" ? (
        <article aria-label={kid.name} className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            {avatar}
            <div className="min-w-0 flex-1">{name}</div>
            <PhaseChip phase={phase} progress={progress} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <Big value={stats?.wpm ?? null} unit={stats?.isAverage ? "avg wpm" : "wpm"} />
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">{stats ? `${stats.accuracy}%` : "–"} <span className="text-xs font-normal">acc</span></span>
          </div>
          {bar}
          {showSteps && <TestDots tests={room.tests} index={kid.step} />}
        </article>
      ) : (
        <article aria-label={kid.name} className="flex items-center gap-3 px-4 py-2.5">
          {avatar}
          <div className="w-28 min-w-0 shrink-0 sm:w-36">{name}</div>
          <div className="hidden min-w-0 flex-1 sm:block">{bar}</div>
          <span className="w-16 text-right text-lg font-black tabular-nums">{stats?.wpm ?? "–"}<span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span></span>
          <span className="hidden w-12 text-right text-sm tabular-nums text-muted-foreground sm:inline">{stats ? `${stats.accuracy}%` : "–"}</span>
          <span className="ml-auto sm:ml-0"><PhaseChip phase={phase} progress={progress} /></span>
        </article>
      )}
    </motion.li>
  );
}
