import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CoffeeIcon, CrownSimpleIcon, DotsSixVerticalIcon, HourglassMediumIcon, PauseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { CardStyle } from "@/hooks/useConnectBoardPrefs";
import { cn } from "@/lib/utils";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import {
  BOARD_STATUS_LABELS, effectiveTestIndex, headlineStats, isAway, participantStatus, progressDetail, type BoardStatus,
} from "@/components/connect/board/board-model";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { PresenceDot, ProgressBar } from "@/components/connect/ConnectBadges";
import { CardName, CardWpm, StatusLine, TestPips } from "@/components/connect/board/card-parts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

export type TestLabel = { title: string; detail: string };

export interface ParticipantCardProps {
  room: HostRoom;
  participant: HostParticipant;
  labels: TestLabel[];
  layout: "grid" | "list";
  /** How a card looks in the grid layout: the name on a filling ribbon, or the speed as a big number. */
  cardStyle?: CardStyle;
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
  { room, participant, labels, layout, cardStyle = "ribbon", now, sortable = false, showPicture = true, leader = false }, ref,
) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging, style } = useCardSortable(participant._id, sortable);
  const status = participantStatus(room, participant);
  const progress = progressDetail(room, participant, now);
  const stats = headlineStats(room, participant);
  const away = isAway(participant);
  const finished = status === "finished" || status === "done";
  const showSteps = room.pacing === "participant" && room.status !== "lobby" && room.tests.length > 1;
  const cards = layout === "grid";
  const ribbon = cardStyle === "ribbon";
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
  const avatarSize = !cards ? "size-[2em] text-[0.85em]" : ribbon ? "size-[2.3em] text-[1em]" : "size-[1.9em] text-[1em]";
  // The ribbon puts its crown beside the name instead, where it has room.
  const avatar = (crown: boolean) => (
    <span className="relative shrink-0">
      <ConnectAvatar name={name} avatarUrl={showPicture ? participant.avatarUrl : undefined} className={cn(avatarSize, away && "opacity-40")} />
      <AnimatePresence>
        {finished && (
          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="absolute -bottom-[0.2em] -right-[0.2em] flex size-[1.05em] items-center justify-center rounded-full bg-success text-background ring-2 ring-card">
            <CheckIcon weight="bold" className="size-[0.65em]" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {crown && leader && (
          <motion.span initial={{ y: 6, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0, scale: 0.5 }} transition={CONNECT_SPRING}
            className="absolute -left-[0.4em] -top-[0.85em] -rotate-12" style={{ color: GOLD }}>
            <CrownSimpleIcon weight="fill" className="size-[1.2em] drop-shadow" aria-label="Fastest right now" />
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
  const frame = cn("min-w-0 border bg-card text-card-foreground transition-colors",
    away ? "border-dashed border-border bg-muted text-muted-foreground"
      : status === "late" ? "border-dashed border-warning/60"
        : finished ? "border-success/60" : leader ? "border-[#d6a738]/60" : "border-border",
    !cards ? "rounded-[1.4em]" : ribbon ? "rounded-[0.9em]" : "rounded-[1.1em]",
    isDragging && "relative z-10 shadow-2xl ring-2 ring-primary");

  const statusText = status === "typing" || status === "break" ? progress.label : BOARD_STATUS_LABELS[status];
  const pips = showSteps && <TestPips tests={room.tests} titles={labels.map((label) => label.title)} index={index} className={ribbon ? "h-[0.4em] w-[3em] shrink-0" : "w-[2.6em] shrink-0"} />;

  const content = !cards ? null : ribbon ? (
    <article aria-label={name} className="@container relative flex h-full min-w-0 items-center gap-[0.6em] overflow-hidden rounded-[inherit] py-[0.5em] pl-[0.55em] pr-[0.8em]">
      <motion.span aria-hidden="true" initial={false} animate={{ width: `${progress.percent}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("absolute inset-y-0 left-0", away ? "bg-foreground/5" : finished ? "bg-success/18" : status === "break" ? "bg-muted-foreground/12" : "bg-primary/16")} />
      <span role="progressbar" aria-label={`${name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percent)} aria-valuetext={progress.label} className="sr-only" />
      {handle}
      {avatar(false)}
      <div className="relative flex min-w-0 flex-1 flex-col gap-[0.15em]">
        <div className="flex min-w-0 items-center gap-[0.5em]">
          <CardName name={name} size={1.4} reserve={leader ? 7.6 : 6} className="flex-1" />
          {leader && <CrownSimpleIcon weight="fill" className="size-[1.4em] shrink-0" style={{ color: GOLD }} aria-label="Fastest right now" />}
          <CardWpm value={wpm} title={statTitle} className="shrink-0 text-[1.75em]" />
        </div>
        <div className="flex min-w-0 items-center gap-[0.5em] text-[0.8em]">
          {pips}
          <StatusLine status={status} text={statusText} className="min-w-0 flex-1" />
          <span className="shrink-0 tabular-nums text-muted-foreground" title={statTitle}>
            {stats.isAverage && <span>avg · </span>}<span>{accuracy}</span>
          </span>
        </div>
      </div>
    </article>
  ) : (
    <article aria-label={name} className="@container relative flex h-full min-w-0 flex-col gap-[0.45em] rounded-[inherit] px-[0.85em] pb-[1em] pt-[0.75em]">
      <header className="flex min-w-0 items-center gap-[0.5em]">
        {handle}
        {avatar(true)}
        <CardName name={name} size={1.2} reserve={sortable ? 4.8 : 3.6} className="flex-1" />
        <PresenceDot online={!away} className="size-[0.55em]" />
      </header>
      <div className="flex items-end justify-between gap-[0.5em]">
        <span className="flex items-baseline gap-[0.2em]" title={statTitle}>
          <CardWpm value={wpm} className="text-[3.1em] tracking-tight" />
          <span className="text-[0.8em] font-semibold text-muted-foreground">{stats.isAverage ? "avg wpm" : "wpm"}</span>
        </span>
        <span className="flex flex-col items-end leading-none" title={statTitle}>
          <span className="text-[1.15em] font-bold tabular-nums">{accuracy}</span>
          <span className="text-[0.7em] text-muted-foreground">acc</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-[0.6em]">
        <StatusLine status={status} text={statusText} className="min-w-0 flex-1 text-[0.85em]" />
        {pips}
      </div>
      {/* Clipped on its own so the crown can still poke out of the card. */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <ProgressBar value={progress.percent} valueText={progress.label} done={finished} label={`${name} progress`}
          className={cn("absolute inset-x-0 bottom-0 h-[0.4em] rounded-none", status === "break" && "[&>div]:bg-muted-foreground/50")} />
      </span>
    </article>
  );
  const row = (
    <article aria-label={name} className="flex items-center gap-[0.75em] px-[1em] py-[0.6em]">
      {handle}
      {avatar(true)}
      <div className="w-[7em] min-w-0 shrink-0 sm:w-[9em]">{nameLine}</div>
      <div className="hidden min-w-0 flex-1 sm:block">{bar}</div>
      <span className="w-[4em] text-right text-[1.15em] font-black tabular-nums" title={statTitle}>{wpm}<span className="ml-[0.25em] text-[0.65em] font-normal text-muted-foreground">{stats.isAverage ? "avg" : "wpm"}</span></span>
      <span className="hidden w-[3em] text-right text-[0.875em] tabular-nums text-muted-foreground sm:inline" title={statTitle}>{accuracy}</span>
      <span className="ml-auto sm:ml-0"><StatusChip status={status} progress={progress.label} /></span>
    </article>
  );

  const data = { "data-participant": participant._id, "data-status": status, "data-away": away || undefined };
  if (sortable) {
    return <li ref={setNodeRef} style={style} className={frame} {...data}>{content ?? row}</li>;
  }
  return (
    <motion.li ref={ref} layout transition={CONNECT_SPRING} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={frame} {...data}>
      {content ?? row}
    </motion.li>
  );
});
