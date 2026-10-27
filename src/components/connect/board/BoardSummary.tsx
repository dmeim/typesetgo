import { CheckCircleIcon, UsersIcon } from "@phosphor-icons/react";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";
import { boardCounts, stepLine } from "@/components/connect/board/board-model";
import type { TestLabel } from "@/components/connect/board/ParticipantCard";
import { StatusBadge, TestDots } from "@/components/connect/ConnectBadges";

/** Where the room is: the test, what it waits on, and who's online and finished. */
export function BoardSummary({ room, participants, labels, className }: {
  room: HostRoom;
  participants: HostParticipant[];
  labels: TestLabel[];
  className?: string;
}) {
  const hostPaced = room.pacing === "host";
  const now = useNow(hostPaced && room.status === "running", 500);
  const counts = boardCounts(room, participants);
  const total = room.tests.length;
  const plural = total === 1 ? "test" : "tests";
  const index = Math.min(room.currentIndex, total);
  const label = labels[index];
  const heading = room.status === "lobby" ? `${total} ${plural} ready`
    : room.status === "complete" ? `All ${total} ${plural} complete`
      : hostPaced ? `Test ${index + 1} of ${total} · ${label?.title ?? ""}` : `${total} ${plural} · own pace`;
  const detail = room.status === "lobby" ? "Waiting for the host to start"
    : room.status === "complete" ? "Great typing, everyone!"
      : hostPaced ? `${label?.detail ?? ""} · ${room.status === "paused" ? "Paused" : stepLine(room, participants, now)}` : "Everyone moves through the list at their own speed";

  return (
    <section aria-label="Room progress" className={cn("flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-center", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          <h2 className="text-xl font-black [overflow-wrap:anywhere]">{heading}</h2>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
        {hostPaced && room.status !== "lobby" && total > 1 && (
          <TestDots tests={room.tests} titles={labels.map((item) => item.title)} index={room.status === "complete" ? total : index} className="max-w-md" />
        )}
      </div>
      <dl className="flex shrink-0 gap-3">
        <div className="flex min-w-24 flex-col items-center rounded-2xl bg-muted/50 px-4 py-2">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground"><UsersIcon className="size-3.5" aria-hidden="true" />Online</dt>
          <dd className="text-2xl font-black tabular-nums">{counts.online}<span className="text-sm font-normal text-muted-foreground">/{counts.total}</span></dd>
        </div>
        {room.status !== "lobby" && (
          <div className="flex min-w-24 flex-col items-center rounded-2xl bg-success/10 px-4 py-2">
            <dt className="flex items-center gap-1 text-xs text-success"><CheckCircleIcon weight="fill" className="size-3.5" aria-hidden="true" />{hostPaced ? "Finished" : "All done"}</dt>
            <dd className="text-2xl font-black tabular-nums">{hostPaced ? counts.finished : counts.done}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
