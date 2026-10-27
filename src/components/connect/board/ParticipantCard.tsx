import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, CrownSimpleIcon, DotsSixVerticalIcon, HourglassMediumIcon, PauseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import {
  BOARD_STATUS_LABELS, effectiveTestIndex, headlineStats, isAway, participantStatus, progressDetail, type BoardStatus,
} from "@/components/connect/board/board-model";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { PresenceDot, ProgressBar, TestDots } from "@/components/connect/ConnectBadges";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

export type TestLabel = { title: string; detail: string };

export interface ParticipantCardProps {
  room: HostRoom;
  participant: HostParticipant;
  labels: TestLabel[];
  layout: "grid" | "list";
  /** Clock for break countdowns. */
  now?: number;
  /** Renders a drag handle and joins the surrounding sortable context. */
  sortable?: boolean;
  /** Shows the account picture; off keeps the letter avatar. */
  showPicture?: boolean;
  /** The fastest player right now gets a crown. */
  leader?: boolean;
}

const GOLD = "#d6a738";

const CHIP_TONE: Partial<Record<BoardStatus, string>> = {
  finished: "bg-success/15 text-success",
  done: "bg-success/15 text-success",
  typing: "bg-primary/12 text-primary",
  late: "bg-warning/15 text-warning",
  paused: "bg-warning/15 text-warning",
};

const CHIP_ICON: Partial<Record<BoardStatus, typeof CheckIcon>> = {
  break: CoffeeIcon, late: HourglassMediumIcon, offline: WifiSlashIcon, left: WifiSlashIcon, paused: PauseIcon, finished: CheckIcon, done: CheckIcon,
};

/** The player's state; while typing it shows how far through the test they are instead. */
function StatusChip({ status, progress }: { status: BoardStatus; progress: string }) {
  const ChipIcon = CHIP_ICON[status];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={status} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={CONNECT_SPRING}
        className={cn("inline-flex shrink-0 items-center gap-[0.3em] whitespace-nowrap rounded-full px-[0.65em] py-[0.25em] text-[0.75em] font-bold tabular-nums", CHIP_TONE[status] ?? "bg-muted text-muted-foreground")}>
        {ChipIcon && <ChipIcon className="size-[1.15em]" aria-hidden="true" />}
        {status === "typing" ? <><span className="sr-only">Typing, </span>{progress}</> : BOARD_STATUS_LABELS[status]}
      </motion.span>
    </AnimatePresence>
  );
}

function BigNumber({ value, unit, title }: { value: number; unit: string; title?: string }) {
  const shown = useAnimatedCounter(value, 500);
  return (
    <span className="flex items-baseline gap-[0.25em]" title={title}>
      <span className="text-[2.25em] font-black leading-none tabular-nums">{shown}</span>
      <span className="text-[0.75em] text-muted-foreground">{unit}</span>
    </span>
  );
}

function useCardSortable(id: string, enabled: boolean) {
  const sortable = useSortable({ id, disabled: !enabled });
  const style: CSSProperties = enabled ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition } : {};
  return { ...sortable, style };
}

/**
 * One player on the live board. Sizes are in em, so the board's card-size setting scales everything.
 * Cards slide to their new place when the order changes; in your own order they drag instead.
 */
export const ParticipantCard = forwardRef<HTMLLIElement, ParticipantCardProps>(function ParticipantCard(
  { room, participant, labels, layout, now, sortable = false, showPicture = true, leader = false }, ref,
) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging, style } = useCardSortable(participant._id, sortable);
  const status = participantStatus(room, participant);
  const progress = progressDetail(room, participant, now);
  const stats = headlineStats(room, participant);
  const away = isAway(participant);
  const finished = status === "finished" || status === "done";
  const showSteps = room.pacing === "participant" && room.status !== "lobby" && room.tests.length > 1;
  const cards = layout === "grid";
  const index = effectiveTestIndex(room, participant);
  const wpm = Math.round(stats.wpm);
  const accuracy = `${Math.round(stats.accuracy)}%`;
  const statTitle = stats.isAverage ? "Average over all tests" : undefined;
  const { name } = participant;

  const handle: ReactNode = sortable && (
    <button type="button" ref={setActivatorNodeRef} aria-label={`Reorder ${name}`} {...attributes} {...listeners}
      className="-ml-[0.3em] flex shrink-0 cursor-grab touch-none items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
      <DotsSixVerticalIcon className="size-[1.25em]" aria-hidden="true" />
    </button>
  );
  const avatar = (
    <span className="relative shrink-0">
      <ConnectAvatar name={name} avatarUrl={showPicture ? participant.avatarUrl : undefined} className={cn(cards ? "size-[2.5em] text-[1em]" : "size-[2em] text-[0.85em]", away && "opacity-40")} />
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
          <motion.span initial={{ y: 6, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0, scale: 0.5 }} transition={CONNECT_SPRING}
            className="absolute -left-[0.4em] -top-[0.9em] -rotate-12" style={{ color: GOLD }}>
            <CrownSimpleIcon weight="fill" className="size-[1.25em] drop-shadow" aria-label="Fastest right now" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
  const nameLine = (
    <span className="flex min-w-0 items-center gap-[0.4em]">
      <h3 className="truncate text-[1em] font-bold" title={name}>{name}</h3>
      <PresenceDot online={!away} className="size-[0.6em]" />
    </span>
  );
  const bar = <ProgressBar value={progress.percent} valueText={progress.label} done={finished} label={`${name} progress`} className="h-[0.6em]" />;
  const frame = cn("min-w-0 rounded-[1.4em] border bg-card text-card-foreground transition-colors",
    away ? "border-dashed border-border bg-muted text-muted-foreground"
      : status === "late" ? "border-dashed border-warning/60"
        : finished ? "border-success/60" : leader ? "border-[#d6a738]/60" : "border-border",
    isDragging && "relative z-10 shadow-2xl ring-2 ring-primary");

  const content = cards ? (
    <article aria-label={name} className="flex h-full flex-col gap-[0.75em] p-[1em]">
      <div className="flex items-center gap-[0.75em]">
        {handle}
        {avatar}
        <div className="min-w-0 flex-1">{nameLine}</div>
        <StatusChip status={status} progress={progress.label} />
      </div>
      <div className="flex items-end justify-between gap-[0.5em]">
        <BigNumber value={wpm} unit={stats.isAverage ? "avg wpm" : "wpm"} title={statTitle} />
        <span className="text-[0.875em] font-semibold tabular-nums text-muted-foreground" title={statTitle}>{accuracy} <span className="text-[0.85em] font-normal">acc</span></span>
      </div>
      {bar}
      {showSteps && (
        <TestDots tests={room.tests} titles={labels.map((label) => label.title)} index={index}
          label={index >= room.tests.length ? `All ${room.tests.length} tests done` : `Test ${index + 1} of ${room.tests.length}: ${labels[index]?.title ?? ""}`} />
      )}
    </article>
  ) : (
    <article aria-label={name} className="flex items-center gap-[0.75em] px-[1em] py-[0.6em]">
      {handle}
      {avatar}
      <div className="w-[7em] min-w-0 shrink-0 sm:w-[9em]">{nameLine}</div>
      <div className="hidden min-w-0 flex-1 sm:block">{bar}</div>
      <span className="w-[4em] text-right text-[1.15em] font-black tabular-nums" title={statTitle}>{wpm}<span className="ml-[0.25em] text-[0.65em] font-normal text-muted-foreground">{stats.isAverage ? "avg" : "wpm"}</span></span>
      <span className="hidden w-[3em] text-right text-[0.875em] tabular-nums text-muted-foreground sm:inline" title={statTitle}>{accuracy}</span>
      <span className="ml-auto sm:ml-0"><StatusChip status={status} progress={progress.label} /></span>
    </article>
  );

  const data = { "data-participant": participant._id, "data-status": status, "data-away": away || undefined };
  if (sortable) {
    return <li ref={setNodeRef} style={style} className={frame} {...data}>{content}</li>;
  }
  return (
    <motion.li ref={ref} layout transition={CONNECT_SPRING} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={frame} {...data}>
      {content}
    </motion.li>
  );
});
