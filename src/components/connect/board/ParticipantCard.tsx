import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowClockwiseIcon, DotsSixVerticalIcon, UserMinusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import {
  averageResults,
  BOARD_STATUS_LABELS,
  effectiveTestIndex,
  headlineStats,
  isAway,
  participantStatus,
  progressDetail,
  testSegments,
} from "@/components/connect/board/board-model";
import { TestStrip } from "@/components/connect/board/TestStrip";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";

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
  onReset?: (participant: HostParticipant) => void;
  onRemove?: (participant: HostParticipant) => void;
}

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn("absolute -right-[0.1em] -bottom-[0.1em] size-[0.6em] rounded-full ring-[0.15em]", online ? "bg-success ring-card" : "border border-muted-foreground bg-muted ring-muted")}
      role="img"
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

function Stat({ value, unit, large, title }: { value: number; unit: string; large?: boolean; title?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-[0.25em]" title={title}>
      <span className={cn("font-mono font-bold leading-none tabular-nums", large ? "text-[2.4em]" : "text-[1.35em]")}>
        {Math.round(value)}
      </span>
      <span className="text-[0.75em] text-muted-foreground">{unit}</span>
    </div>
  );
}

function ordinalPosition(index: number, total: number) {
  return `Test ${Math.min(index + 1, total)} of ${total}`;
}

function Actions({ participant, late, onReset, onRemove }: Pick<ParticipantCardProps, "participant" | "onReset" | "onRemove"> & { late: boolean }) {
  if (!onReset && !onRemove) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onReset && (
        <Button variant="ghost" size="icon-sm" aria-label={`Reset ${participant.name}`} title={late ? "Let them start this test now" : "Reset this attempt"} onClick={() => onReset(participant)}>
          <ArrowClockwiseIcon aria-hidden="true" />
        </Button>
      )}
      {onRemove && (
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${participant.name}`} title="Remove from room" className="hover:text-destructive" onClick={() => onRemove(participant)}>
          <UserMinusIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function useCardSortable(id: string, enabled: boolean) {
  const sortable = useSortable({ id, disabled: !enabled });
  const style: CSSProperties = enabled
    ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }
    : {};
  return { ...sortable, style };
}

export function ParticipantCard({ room, participant, labels, layout, now, sortable = false, showPicture = true, onReset, onRemove }: ParticipantCardProps) {
  const { setNodeRef, attributes, listeners, isDragging, style, setActivatorNodeRef } = useCardSortable(participant._id, sortable);
  const status = participantStatus(room, participant);
  const progress = progressDetail(room, participant, now);
  const stats = headlineStats(room, participant);
  const average = averageResults(participant.results);
  const away = isAway(participant);
  const index = effectiveTestIndex(room, participant);
  const showPosition = room.pacing === "participant" && room.tests.length > 0 && room.status !== "lobby";
  const finishedLook = status === "finished" || status === "done";

  const handle: ReactNode = sortable ? (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="-ml-[0.25em] flex shrink-0 cursor-grab touch-none items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
      aria-label={`Reorder ${participant.name}`}
      {...attributes}
      {...listeners}
    >
      <DotsSixVerticalIcon className="size-[1.1em]" aria-hidden="true" />
    </button>
  ) : null;

  const identity = (
    <div className="flex min-w-0 items-center gap-[0.5em]">
      {handle}
      <span className="relative shrink-0">
        <ConnectAvatar name={participant.name} avatarUrl={showPicture ? participant.avatarUrl : undefined} className={cn(away && "opacity-60")} />
        <PresenceDot online={!away} />
      </span>
      <h3 className="min-w-0 truncate text-[1.05em] font-semibold" title={participant.name}>{participant.name}</h3>
      {/* Status shows through the presence dot, dimming, and progress colour; keep it for screen readers. */}
      <span className="sr-only">{BOARD_STATUS_LABELS[status]}</span>
    </div>
  );

  const progressBar = (
    <div className="min-w-0 space-y-[0.3em]">
      <div className="flex items-baseline justify-between gap-[0.5em] text-[0.75em] text-muted-foreground">
        <span className="truncate tabular-nums">{progress.label}</span>
        {average && !stats.isAverage && <span className="shrink-0 tabular-nums" title={`Average over ${average.count} finished ${average.count === 1 ? "test" : "tests"}`}>avg {Math.round(average.wpm)} wpm</span>}
      </div>
      <div
        role="progressbar"
        aria-label={`${participant.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.percent)}
        aria-valuetext={progress.label}
        className="h-[0.4em] w-full overflow-hidden rounded-full bg-foreground/15"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", finishedLook ? "bg-success" : "bg-primary")}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );

  const position = showPosition ? (
    <div className="min-w-0 space-y-[0.35em]">
      <p className="truncate text-[0.75em] text-muted-foreground">
        {index >= room.tests.length ? `All ${room.tests.length} tests done` : `${ordinalPosition(index, room.tests.length)} · ${labels[index]?.title ?? ""}`}
      </p>
      <TestStrip segments={testSegments(room, participant)} labels={labels.map((label) => label.title)} />
    </div>
  ) : null;

  const statTitle = stats.isAverage ? "Average over all tests" : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-participant={participant._id}
      data-status={status}
      data-away={away || undefined}
      className={cn(
        "min-w-0 rounded-[0.75em] border border-border bg-card text-card-foreground shadow-xs transition-colors",
        // Away cards recede with opaque muted roles rather than opacity, which would drop text contrast.
        away && "border-dashed bg-muted text-muted-foreground",
        finishedLook && !away && "border-success",
        isDragging && "relative z-10 shadow-lg ring-2 ring-ring",
      )}
    >
      {layout === "grid" ? (
        <article className="flex h-full flex-col gap-[0.75em] p-[0.9em]" aria-label={participant.name}>
          <div className="-my-[0.2em] -mr-[0.35em] flex min-h-[2em] items-center justify-between gap-[0.5em]">
            {identity}
            <Actions participant={participant} late={status === "late"} onReset={onReset} onRemove={onRemove} />
          </div>
          <div className="flex items-end justify-between gap-[0.75em]">
            <Stat value={stats.wpm} unit={stats.isAverage ? "avg wpm" : "wpm"} large title={statTitle} />
            <Stat value={stats.accuracy} unit="% acc" title={statTitle} />
          </div>
          {progressBar}
          {position}
        </article>
      ) : (
        <article className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.5em] px-[0.9em] py-[0.6em] sm:flex-nowrap" aria-label={participant.name}>
          <div className="flex w-full min-w-0 items-center justify-between gap-[1em] sm:w-auto sm:shrink-0">
            <div className="min-w-0 sm:w-[11em]">{identity}</div>
            <div className="flex shrink-0 items-baseline gap-[1em]">
              <div className="flex w-[4.5em] justify-end"><Stat value={stats.wpm} unit={stats.isAverage ? "avg" : "wpm"} title={statTitle} /></div>
              <div className="flex w-[4.5em] justify-end"><Stat value={stats.accuracy} unit="%" title={statTitle} /></div>
            </div>
          </div>
          <div className="min-w-[8em] flex-1 space-y-[0.4em]">
            {progressBar}
            {position}
          </div>
          <Actions participant={participant} late={status === "late"} onReset={onReset} onRemove={onRemove} />
        </article>
      )}
    </li>
  );
}
