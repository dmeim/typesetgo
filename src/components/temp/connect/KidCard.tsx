import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, CrownSimpleIcon, DotsSixVerticalIcon, HourglassMediumIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import type { Kid } from "./connect-mock";
import { KidAvatar, PresenceDot, ProgressBar, TestDots } from "./ConnectParts";
import { PHASE_LABELS, kidPhase, kidProgress, kidStats, type KidPhase } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const GOLD = "#d6a738";

function useCardSortable(id: string, enabled: boolean) {
  const sortable = useSortable({ id, disabled: !enabled });
  const style: CSSProperties = enabled ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition } : {};
  return { ...sortable, style };
}

function Big({ value, unit }: { value: number | null; unit: string }) {
  const shown = useAnimatedCounter(value ?? 0, 500);
  return (
    <span className="flex items-baseline gap-[0.25em]">
      <span className="text-[2.25em] font-black leading-none tabular-nums">{value === null ? "–" : shown}</span>
      <span className="text-[0.75em] text-muted-foreground">{unit}</span>
    </span>
  );
}

const PHASE_TONE: Partial<Record<KidPhase, string>> = {
  finished: "bg-success/15 text-success",
  done: "bg-success/15 text-success",
  typing: "bg-primary/12 text-primary",
  late: "bg-warning/15 text-warning",
};

function PhaseChip({ phase, progress }: { phase: KidPhase; progress: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={phase} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={LAB_SPRING}
        className={cn("inline-flex shrink-0 items-center gap-[0.3em] whitespace-nowrap rounded-full px-[0.65em] py-[0.25em] text-[0.75em] font-bold tabular-nums", PHASE_TONE[phase] ?? "bg-muted text-muted-foreground")}>
        {phase === "break" && <CoffeeIcon className="size-[1.15em]" aria-hidden="true" />}
        {phase === "late" && <HourglassMediumIcon className="size-[1.15em]" aria-hidden="true" />}
        {phase === "offline" && <WifiSlashIcon className="size-[1.15em]" aria-hidden="true" />}
        {(phase === "finished" || phase === "done") && <CheckIcon className="size-[1.15em]" aria-hidden="true" />}
        {phase === "typing" ? `${Math.round(progress)}%` : PHASE_LABELS[phase]}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * One student on the live board. Sizes are in em, so the board's card-size setting scales everything.
 * Cards slide to their new place when the order changes; in your own order they drag instead.
 */
export function KidCard({ room, kid, leader, layout, sortable = false }: { room: MockRoom; kid: Kid; leader: boolean; layout: "cards" | "list"; sortable?: boolean }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging, style } = useCardSortable(kid.id, sortable);
  const phase = kidPhase(room, kid);
  const progress = kidProgress(room, kid);
  const stats = kidStats(room, kid);
  const finished = phase === "finished" || phase === "done";
  const showSteps = room.pacing === "participant" && room.status !== "lobby";
  const cards = layout === "cards";
  const handle = sortable && (
    <button type="button" ref={setActivatorNodeRef} aria-label={`Move ${kid.name}`} {...attributes} {...listeners}
      className="-ml-[0.3em] flex shrink-0 cursor-grab touch-none items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
      <DotsSixVerticalIcon className="size-[1.25em]" aria-hidden="true" />
    </button>
  );
  const avatar = (
    <span className="relative shrink-0">
      <KidAvatar name={kid.name} photo={kid.signedIn} className={cn(cards ? "size-[2.5em] text-[1em]" : "size-[2em] text-[0.85em]", !kid.online && "opacity-40")} />
      <AnimatePresence>
        {finished && (
          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="absolute -bottom-[0.25em] -right-[0.25em] flex size-[1.15em] items-center justify-center rounded-full bg-success text-background ring-2 ring-card">
            <CheckIcon weight="bold" className="size-[0.7em]" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {leader && (
          <motion.span initial={{ y: 6, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0, scale: 0.5 }} transition={LAB_SPRING}
            className="absolute -left-[0.4em] -top-[0.9em] -rotate-12" style={{ color: GOLD }}>
            <CrownSimpleIcon weight="fill" className="size-[1.25em] drop-shadow" aria-label="Fastest right now" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
  const name = (
    <span className="flex min-w-0 items-center gap-[0.4em]">
      <span className="truncate font-bold">{kid.name}</span>
      {kid.isYou && <span className="rounded-full bg-primary px-[0.4em] py-[0.15em] text-[0.6em] font-bold uppercase text-primary-foreground">You</span>}
      <PresenceDot online={kid.online} className="size-[0.6em]" />
    </span>
  );
  const bar = <ProgressBar value={progress} done={finished} label={`${kid.name} progress`} className="h-[0.6em]" />;
  const frame = cn("min-w-0 rounded-[1.4em] border bg-card transition-colors",
    !kid.online ? "border-dashed border-border bg-muted/40 text-muted-foreground"
      : phase === "late" ? "border-dashed border-warning/60"
        : finished ? "border-success/60" : leader ? "border-[#d6a738]/60" : "border-border",
    isDragging && "relative z-10 shadow-2xl ring-2 ring-primary");

  const content = cards ? (
    <article aria-label={kid.name} data-status={phase} className="flex h-full flex-col gap-[0.75em] p-[1em]">
      <div className="flex items-center gap-[0.75em]">
        {handle}
        {avatar}
        <div className="min-w-0 flex-1">{name}</div>
        <PhaseChip phase={phase} progress={progress} />
      </div>
      <div className="flex items-end justify-between gap-[0.5em]">
        <Big value={stats?.wpm ?? null} unit={stats?.isAverage ? "avg wpm" : "wpm"} />
        <span className="text-[0.875em] font-semibold tabular-nums text-muted-foreground">{stats ? `${stats.accuracy}%` : "–"} <span className="text-[0.85em] font-normal">acc</span></span>
      </div>
      {bar}
      {showSteps && <TestDots tests={room.tests} titles={room.labels.map((label) => label.title)} index={kid.step} />}
    </article>
  ) : (
    <article aria-label={kid.name} data-status={phase} className="flex items-center gap-[0.75em] px-[1em] py-[0.6em]">
      {handle}
      {avatar}
      <div className="w-[7em] min-w-0 shrink-0 sm:w-[9em]">{name}</div>
      <div className="hidden min-w-0 flex-1 sm:block">{bar}</div>
      <span className="w-[4em] text-right text-[1.15em] font-black tabular-nums">{stats?.wpm ?? "–"}<span className="ml-[0.25em] text-[0.65em] font-normal text-muted-foreground">wpm</span></span>
      <span className="hidden w-[3em] text-right text-[0.875em] tabular-nums text-muted-foreground sm:inline">{stats ? `${stats.accuracy}%` : "–"}</span>
      <span className="ml-auto sm:ml-0"><PhaseChip phase={phase} progress={progress} /></span>
    </article>
  );

  if (sortable) {
    return (
      <li ref={setNodeRef} style={style} className={frame}>
        {content}
      </li>
    );
  }
  return (
    <motion.li layout transition={LAB_SPRING} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={frame}>
      {content}
    </motion.li>
  );
}
