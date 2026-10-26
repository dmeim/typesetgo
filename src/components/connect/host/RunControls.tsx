import { useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowFatRightIcon,
  ArrowLeftIcon,
  ArrowsCounterClockwiseIcon,
  FlagCheckeredIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import {
  breakEndsAt,
  isBreakTest,
  isTimedConnectTest,
  isWaitingForNextTest,
  resultsEndAt,
  stepAfterResults,
  timedTestEndsAt,
  type ConnectPacing,
  type ConnectTest,
} from "@/lib/connect-types";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/components/connect/board/board-model";
import { ConfirmDialog } from "./ConfirmDialog";
import { Segmented } from "./Segmented";
import { selfPacedCounts } from "./host-utils";
import type { HostRoomActions } from "./use-host-room";

const PACING_HELP: Record<ConnectPacing, string> = {
  host: "Everyone moves through the list together, on its own once you start. Next and Previous still move everyone whenever you like.",
  participant: "Everyone works through the list at their own speed after you start.",
};

/** Host pacing: what the room is waiting on before it moves on by itself. */
function StepCountdown({ room, participants }: { room: HostRoom; participants: HostParticipant[] }) {
  const paused = room.status === "paused";
  const now = useNow(!paused, 500);
  const index = room.currentIndex;
  const test = room.tests[index];
  const pausedAt = paused ? room.pausedAt : undefined;
  if (!test) return null;
  const left = (endsAt: number) => formatClock(endsAt - now);
  const startedAt = room.stepStartedAt ?? now;
  let text: string;
  if (isBreakTest(test)) {
    text = `Break, next test in ${left(breakEndsAt(test, startedAt, pausedAt, now))}`;
  } else if (room.stepEndedAt !== undefined) {
    const endsAt = left(resultsEndAt(room.tests, index, room.stepEndedAt, pausedAt, now));
    const last = stepAfterResults(room.tests, index) >= room.tests.length;
    text = isBreakTest(room.tests[index + 1])
      ? `Break, ${last ? "finishing" : "next test"} in ${endsAt}`
      : `Results, ${last ? "finishing" : "next test"} in ${endsAt}`;
  } else if (isTimedConnectTest(test)) {
    text = `Ends in ${left(timedTestEndsAt(test, startedAt, pausedAt, now))}`;
  } else {
    const taking = participants.filter((p) =>
      p.removedAt === undefined && p.leftAt === undefined && p.isConnected && !isWaitingForNextTest(room, p));
    text = `${taking.filter((p) => p.stats.isFinished).length} of ${taking.length} finished`;
  }
  return <span className="text-muted-foreground"> · {text}</span>;
}

function RunSummary({ room, tests, participants, pacing }: {
  room: HostRoom;
  tests: ConnectTest[];
  participants: HostParticipant[];
  pacing: ConnectPacing;
}) {
  const total = tests.length;
  const plural = total === 1 ? "test" : "tests";
  if (room.status === "lobby") return <p className="text-sm text-muted-foreground">{total} {plural} ready. Start when everyone has joined.</p>;
  if (room.status === "complete") return <p className="text-sm text-muted-foreground">All {total} {plural} complete.</p>;
  if (pacing === "host") {
    return (
      <p className="text-sm">
        <span className="font-semibold">Test {Math.min(room.currentIndex + 1, total)} of {total}</span>
        <StepCountdown room={room} participants={participants} />
        {room.status === "paused" && <span className="text-muted-foreground"> · Paused</span>}
      </p>
    );
  }
  const { perTest, done } = selfPacedCounts(total, participants);
  const parts = perTest.flatMap((count, index) => (count ? [`${count} on test ${index + 1}`] : []));
  return (
    <p className="text-sm">
      <span className="font-semibold">Self-paced</span>
      <span className="text-muted-foreground">
        {" · "}{[...parts, `${done} done`].join(" · ")}
        {room.status === "paused" && " · Paused"}
      </span>
    </p>
  );
}

function HostPacedButtons({ room, testCount, actions }: { room: HostRoom; testCount: number; actions: HostRoomActions }) {
  const last = room.currentIndex >= testCount - 1;
  const busy = actions.busy !== null;
  return (
    <>
      <Button type="button" variant="outline" disabled={busy || room.currentIndex <= 0} onClick={() => void actions.goToTest(room.currentIndex - 1)}>
        <ArrowLeftIcon aria-hidden="true" />
        Previous test
      </Button>
      <Button type="button" disabled={busy} onClick={() => void actions.goToTest(room.currentIndex + 1)}>
        {last ? <FlagCheckeredIcon aria-hidden="true" /> : <ArrowFatRightIcon aria-hidden="true" />}
        {last ? "Finish" : "Next test"}
      </Button>
    </>
  );
}

export function RunControls({ room, tests, participants, actions }: {
  room: HostRoom;
  tests: ConnectTest[];
  participants: HostParticipant[];
  actions: HostRoomActions;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const busy = actions.busy !== null;
  const inLobby = room.status === "lobby";
  const active = room.status === "running" || room.status === "paused";
  const pacing = actions.pacing;
  return (
    <section aria-labelledby="connect-run-heading" className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="connect-run-heading" className="text-lg font-semibold">Run</h2>
        <RunSummary room={room} tests={tests} participants={participants} pacing={pacing} />
      </div>
      <div className="space-y-2">
        <Segmented<ConnectPacing>
          label="Pacing"
          value={pacing}
          disabled={!inLobby || actions.busy === "pacing"}
          onChange={(value) => void actions.setPacing(value)}
          options={[{ value: "host", label: "Host-led" }, { value: "participant", label: "Self-paced" }]}
        />
        <p className="text-sm text-muted-foreground">
          {PACING_HELP[pacing]}
          {!inLobby && " Reset the room to change pacing."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(inLobby || room.status === "complete") && (
          <Button type="button" disabled={busy} onClick={() => void actions.start()}>
            <PlayIcon aria-hidden="true" />
            {inLobby ? "Start" : "Start again"}
          </Button>
        )}
        {room.status === "running" && (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void actions.pause()}>
            <PauseIcon aria-hidden="true" />
            Pause
          </Button>
        )}
        {room.status === "paused" && (
          <Button type="button" disabled={busy} onClick={() => void actions.start()}>
            <PlayIcon aria-hidden="true" />
            Resume
          </Button>
        )}
        {active && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void actions.restartTest()}>
            <ArrowClockwiseIcon aria-hidden="true" />
            Restart test
          </Button>
        )}
        {active && pacing === "host" && <HostPacedButtons room={room} testCount={tests.length} actions={actions} />}
        <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
          <ArrowsCounterClockwiseIcon aria-hidden="true" />
          Reset room
        </Button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the room?"
        description="Everyone returns to the lobby and all results from this run are cleared. Participants stay in the room."
        confirmLabel="Reset room"
        onConfirm={() => void actions.resetRoom()}
      />
    </section>
  );
}
