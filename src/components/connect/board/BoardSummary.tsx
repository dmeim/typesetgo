import { CheckCircleIcon, PauseIcon, UsersIcon } from "@phosphor-icons/react";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { boardCounts, type SegmentState } from "@/components/connect/board/board-model";
import { TestStrip } from "@/components/connect/board/TestStrip";
import type { TestLabel } from "@/components/connect/board/ParticipantCard";
import { cn } from "@/lib/utils";

const ROOM_STATUS: Record<HostRoom["status"], string> = {
  lobby: "Waiting to start",
  running: "Running",
  paused: "Paused",
  complete: "Complete",
};

/** Shared test (host pacing) or room overview (participant pacing) shown once above the cards. */
export function BoardSummary({ room, participants, labels, className }: {
  room: HostRoom;
  participants: HostParticipant[];
  labels: TestLabel[];
  className?: string;
}) {
  const counts = boardCounts(room, participants);
  const total = room.tests.length;
  const hostPaced = room.pacing === "host";
  const index = Math.min(room.currentIndex, total);
  const segments: SegmentState[] = room.tests.map((_, i) =>
    room.status === "lobby" ? "upcoming" : room.status === "complete" || i < index ? "done" : i === index ? "current" : "upcoming");

  let heading: string;
  let detail: string | undefined;
  if (room.status === "complete") {
    heading = `All ${total} ${total === 1 ? "test" : "tests"} complete`;
  } else if (hostPaced) {
    heading = `Test ${index + 1} of ${total}`;
    detail = labels[index] ? `${labels[index].title} · ${labels[index].detail}` : undefined;
  } else {
    heading = `${total} ${total === 1 ? "test" : "tests"} · own pace`;
    detail = "Everyone moves through the list at their own speed";
  }

  return (
    <section
      aria-label="Room progress"
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[0.75em] border border-border bg-card px-[1em] py-[0.75em] text-card-foreground", className)}
    >
      <div className="min-w-0 flex-1 space-y-[0.4em]">
        <div className="flex flex-wrap items-baseline gap-x-[0.6em] gap-y-[0.2em]">
          <h2 className="text-[1.15em] font-semibold">{heading}</h2>
          {detail && <p className="text-[0.9em] text-muted-foreground">{detail}</p>}
        </div>
        {hostPaced && <TestStrip segments={segments} labels={labels.map((label) => label.title)} className="max-w-md" />}
      </div>
      <dl className="flex shrink-0 flex-wrap items-center gap-x-[1.25em] gap-y-1 text-[0.85em]">
        <div className="flex items-center gap-[0.4em]">
          <dt className="sr-only">Status</dt>
          <dd className={cn("flex items-center gap-[0.4em] font-medium", room.status === "paused" && "text-warning")}>
            {room.status === "paused" && <PauseIcon weight="fill" className="size-[1em]" aria-hidden="true" />}
            {ROOM_STATUS[room.status]}
          </dd>
        </div>
        <div className="flex items-center gap-[0.4em]">
          <dt className="sr-only">Online</dt>
          <dd className="flex items-center gap-[0.4em]">
            <UsersIcon className="size-[1em] text-muted-foreground" aria-hidden="true" />
            <span><span className="font-semibold tabular-nums">{counts.online}</span> online{counts.total > counts.online && <span className="text-muted-foreground"> / {counts.total}</span>}</span>
          </dd>
        </div>
        {room.status !== "lobby" && (
          <div className="flex items-center gap-[0.4em]">
            <dt className="sr-only">Finished</dt>
            <dd className="flex items-center gap-[0.4em]">
              <CheckCircleIcon className="size-[1em] text-[var(--theme-status-success)]" aria-hidden="true" />
              <span><span className="font-semibold tabular-nums">{hostPaced ? counts.finished : counts.done}</span> {hostPaced ? "finished" : "all done"}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
