import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CircleNotchIcon,
  FlagCheckeredIcon,
  PlayIcon,
  SignInIcon,
  SignOutIcon,
  TimerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { RaceCourse } from "@/components/race";
import RaceState, { RaceError } from "@/components/race/RaceState";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { raceStats, useRaceProgress } from "@/components/race/useRaceProgress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TypingArea, { type TypingStats } from "@/components/typing/TypingArea";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";

type Participant = Doc<"participants">;

export default function RaceActive() {
  const { raceId } = useParams<{ raceId: string }>();
  const sessionId = useSessionId();
  const roomId = raceId as Id<"rooms"> | undefined;
  const room = useQuery(api.rooms.getById, roomId ? { roomId } : "skip");
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip",
  );
  const participant = useQuery(
    api.participants.getBySession,
    room ? { roomId: room._id, sessionId } : "skip",
  );

  if (!raceId || room === null)
    return (
      <RaceState
        title="Race not found"
        description="This room may have expired or been removed."
      />
    );
  if (
    room === undefined ||
    participants === undefined ||
    participant === undefined
  )
    return <RaceState loading title="Loading race…" />;
  if (room.gameMode !== "race")
    return <RaceState title="This is not a race room" />;
  if (!participant?.isConnected)
    return (
      <RaceState title="You are not connected to this race">
        <Link
          className="inline-flex items-center gap-2 underline"
          to={`/race?code=${encodeURIComponent(room.code)}`}
        >
          <SignInIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>Rejoin room {room.code}</span>
        </Link>
      </RaceState>
    );
  if (!room.raceStartTime || !room.targetText)
    return (
      <RaceState title="The race has not started">
        <Link className="inline-flex items-center gap-2 underline" to={`/race/lobby/${room._id}`}>
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Return to lobby
        </Link>
      </RaceState>
    );

  return (
    <RaceAttempt
      key={`${room._id}:${room.raceStartTime}:${participant._id}:${participant.resetVersion ?? 0}`}
      room={room}
      participants={participants}
      participant={participant}
    />
  );
}

function RaceAttempt({
  room,
  participants,
  participant,
}: {
  room: Doc<"rooms">;
  participants: Participant[];
  participant: Participant;
}) {
  const navigate = useNavigate();
  const participantId = participant._id;
  const raceStartTime = room.raceStartTime!;
  const resetVersion = participant.resetVersion ?? 0;
  const [initial] = useState(() => ({
    input: participant.typedText ?? "",
    elapsedMs: participant.stats.timeElapsed,
    legacy:
      participant.typedText === undefined &&
      ((participant.typedProgress ?? 0) > 0 ||
        participant.stats.progress > 0 ||
        participant.stats.timeElapsed > 0) &&
      !participant.stats.isFinished,
  }));
  const [localStats, setLocalStats] = useState<TypingStats | null>(null);
  const [finishStats, setFinishStats] = useState<TypingStats | null>(null);
  const [finishError, setFinishError] = useState("");
  const [finishPending, setFinishPending] = useState(false);
  const finishGuard = useRef(false);
  const finishTime = useRef<number | null>(null);
  const [endError, setEndError] = useState("");
  const endGuard = useRef(false);
  const [showLeave, setShowLeave] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState("");
  const [now, setNow] = useState(Date.now);
  const recordFinish = useMutation(api.participants.recordFinish);
  const endRace = useMutation(api.rooms.endRace);
  const resetStats = useMutation(api.participants.resetStats);
  const { leave, isLeaving, leaveError } = useRaceDeparture(participantId);
  const active =
    now >= raceStartTime &&
    !room.raceEndTime &&
    !finishStats &&
    !participant.stats.isFinished &&
    !initial.legacy &&
    !isLeaving;
  const { report, flush, cancel, progressError } = useRaceProgress(
    participantId,
    raceStartTime,
    resetVersion,
    active,
  );
  const connected = participants.filter((racer) => racer.isConnected);
  const finishers = connected.filter((racer) => racer.stats.isFinished);
  // Departing finishers still count toward the original final-race deadline.
  const finishTimes = participants
    .filter((racer) => racer.stats.isFinished)
    .flatMap((racer) =>
      racer.finishTime === undefined ? [] : [racer.finishTime],
    )
    .sort((a, b) => a - b);
  const deadline =
    finishTimes.length >= 3 ? raceStartTime + finishTimes[2] + 10_000 : null;
  const remaining =
    deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const shouldEnd =
    (connected.length > 0 && finishers.length === connected.length) ||
    remaining === 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room.raceEndTime && !isLeaving)
      navigate(`/race/results/${room._id}`, { replace: true });
  }, [room.raceEndTime, room._id, navigate, isLeaving]);

  const finishRace = useCallback(() => {
    if (endGuard.current || isLeaving) return;
    endGuard.current = true;
    return endRace({ roomId: room._id, raceStartTime }).catch(() => {
      setEndError("Could not finalize the race. Retry to prepare the results.");
    });
  }, [endRace, room._id, raceStartTime, isLeaving]);

  useEffect(() => {
    if (shouldEnd && !room.raceEndTime) void finishRace();
  }, [shouldEnd, room.raceEndTime, finishRace]);

  const handleProgress = useCallback(
    (stats: TypingStats) => {
      setLocalStats(stats);
      report(stats);
    },
    [report],
  );
  const handleFinish = useCallback(
    async (stats: TypingStats) => {
      if (finishGuard.current) return;
      finishGuard.current = true;
      finishTime.current ??= Math.max(0, Date.now() - raceStartTime);
      cancel();
      setFinishStats(stats);
      setFinishPending(true);
      setFinishError("");
      try {
        await recordFinish({
          participantId,
          raceStartTime,
          resetVersion,
          finishTime: finishTime.current,
          typedText: stats.typedText,
          typedProgress: stats.correctChars,
          stats: { ...raceStats(stats), isFinished: true },
        });
      } catch {
        finishGuard.current = false;
        setFinishError(
          "Your finish could not be saved. Retry to record your result.",
        );
      } finally {
        setFinishPending(false);
      }
    },
    [cancel, participantId, raceStartTime, resetVersion, recordFinish],
  );

  useEffect(() => {
    if (showLeave) return;
    const openLeave = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        document.querySelector('[role="dialog"]')
      )
        return;
      event.preventDefault();
      setShowLeave(true);
    };
    window.addEventListener("keydown", openLeave);
    return () => window.removeEventListener("keydown", openLeave);
  }, [showLeave]);

  const racers = connected.map((racer) => ({
    sessionId: racer.sessionId,
    name: racer.name,
    emoji: racer.emoji || "🏎️",
    progress:
      racer._id === participantId
        ? (localStats?.progress ?? racer.stats.progress)
        : racer.stats.progress,
    wpm:
      racer._id === participantId
        ? (localStats?.wpm ?? racer.stats.wpm)
        : racer.stats.wpm,
    isFinished: racer.stats.isFinished,
    position: racer.position,
    isCurrentUser: racer._id === participantId,
  }));

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
        style={{ backgroundColor: tv.ui.card, borderColor: tv.ui.border }}
      >
        <div>
          <h1 className="flex items-center gap-2 font-bold">
            <FlagCheckeredIcon aria-hidden="true" size={18} />
            Race in progress
          </h1>
          <p className="text-sm mt-1" style={{ color: tv.ui.mutedForeground }}>
            {finishers.length} / {connected.length} finished
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {remaining !== null && (
            <span
              className="flex items-center gap-1 text-sm"
              style={{ color: tv.ui.mutedForeground }}
            >
              <TimerIcon aria-hidden="true" size={16} />
              {remaining}s remaining
            </span>
          )}
          <Dialog
            open={showLeave}
            onOpenChange={(open) => {
              if (!isLeaving) setShowLeave(open);
            }}
          >
            <DialogTrigger asChild>
              <button
                className="inline-flex items-center gap-2 border rounded-lg px-3 py-2"
                style={{ borderColor: tv.ui.border }}
              >
                <SignOutIcon aria-hidden="true" size={16} />
                Leave Race
              </button>
            </DialogTrigger>
            <DialogContent
              style={{
                backgroundColor: tv.ui.card,
                color: tv.ui.foreground,
                borderColor: tv.ui.border,
              }}
              showCloseButton={!isLeaving}
            >
              <DialogTitle>Leave this race?</DialogTitle>
              <DialogDescription style={{ color: tv.ui.mutedForeground }}>
                You will disconnect from the race. Other racers can continue.
              </DialogDescription>
              <RaceError>{leaveError}</RaceError>
              <DialogFooter>
                <button
                  disabled={isLeaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2"
                  style={{ backgroundColor: tv.ui.secondary }}
                  onClick={() => setShowLeave(false)}
                >
                  <PlayIcon className="size-4 shrink-0" aria-hidden="true" />
                  Keep Racing
                </button>
                <button
                  disabled={isLeaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2"
                  style={{
                    backgroundColor: tv.ui.destructiveSurface,
                    color: tv.ui.destructive,
                  }}
                  onClick={async () => {
                    await flush();
                    await leave();
                  }}
                >
                  {isLeaving ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <SignOutIcon className="size-4 shrink-0" aria-hidden="true" />}
                  {isLeaving ? "Leaving…" : "Leave Race"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <div className="px-4">
        <RaceError>{endError}</RaceError>
        {endError && (
          <button
            className="inline-flex items-center justify-center gap-2 underline"
            onClick={() => {
              setEndError("");
              endGuard.current = false;
              void finishRace();
            }}
          >
            <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
            Retry results
          </button>
        )}
        <RaceError>{progressError}</RaceError>
        {progressError && (
          <button className="inline-flex items-center justify-center gap-2 underline" onClick={() => void flush()}>
            <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
            Retry sync
          </button>
        )}
      </div>
      <div className="flex-1 min-h-52">
        <RaceCourse racers={racers} isRaceActive={!room.raceEndTime} />
      </div>
      <section
        className="border-t p-4 sm:p-6"
        aria-label="Race typing"
        style={{ backgroundColor: tv.ui.card, borderColor: tv.ui.border }}
      >
        {initial.legacy ? (
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-xl font-bold">Restart this attempt</h2>
            <p style={{ color: tv.ui.mutedForeground }}>
              This older attempt saved your progress but not your exact input.
              Restart from the beginning to continue this race.
            </p>
            <RaceError>{resetError}</RaceError>
            <button
              disabled={resetPending}
              onClick={async () => {
                setResetPending(true);
                setResetError("");
                try {
                  await resetStats({ participantId });
                } catch {
                  setResetError("Could not restart your attempt. Try again.");
                  setResetPending(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50"
              style={{
                backgroundColor: tv.ui.primary,
                color: tv.ui.primaryForeground,
              }}
            >
              {resetPending ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />}
              {resetPending ? "Restarting…" : "Restart my attempt"}
            </button>
          </div>
        ) : finishStats || participant.stats.isFinished ? (
          <div className="text-center space-y-2" role="status">
            <h2 className="text-2xl font-bold">
              {finishPending
                ? "Saving your finish…"
                : participant.stats.isFinished
                  ? "You finished!"
                  : "Finish needs saving"}
            </h2>
            <p style={{ color: tv.ui.mutedForeground }}>
              {participant.position
                ? `Position #${participant.position}. `
                : ""}
              Waiting for other racers.
            </p>
            <RaceError>{finishError}</RaceError>
            {finishError && finishStats && (
              <button
                disabled={finishPending}
                className="inline-flex items-center justify-center gap-2 underline"
                onClick={() => void handleFinish(finishStats)}
              >
                <WarningCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                Retry saving finish
              </button>
            )}
          </div>
        ) : (
          <>
            {now < raceStartTime && (
              <p role="status" className="mb-3 text-center">
                Starting in {Math.ceil((raceStartTime - now) / 1000)}…
              </p>
            )}
            <TypingArea
              targetText={room.targetText!}
              initialInput={initial.input}
              initialElapsedMs={initial.elapsedMs}
              onProgress={handleProgress}
              onFinish={handleFinish}
              isActive={active}
              mode="race"
              feedingTape
              showStats={false}
              fontSize={1.5}
              autoFocus
            />
          </>
        )}
      </section>
    </main>
  );
}
