import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowLeftIcon, ArrowsClockwiseIcon, CircleNotchIcon, FlagCheckeredIcon, PlayIcon, SignInIcon, SignOutIcon, TimerIcon, WarningCircleIcon,
} from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { LiveStandings, LiveTrack } from "@/components/race/LiveTrack";
import { rankLiveRacers, type LiveRacer } from "@/components/race/live-racers";
import { DEFAULT_RACE_EMOJI, RACE_DEADLINE_MS, RACE_SPRING, formatRaceTime, ordinal, racerColor } from "@/components/race/race-format";
import { RACE_OUTLINE_BUTTON, RACE_PRIMARY_BUTTON, RACE_RETRY_BUTTON } from "@/components/race/RaceParts";
import RaceState, { RaceError, RaceShell } from "@/components/race/RaceState";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { raceStats, useRaceProgress } from "@/components/race/useRaceProgress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TypingArea, { type TypingStats } from "@/components/typing/TypingArea";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useMultiplayerPresence } from "@/hooks/useMultiplayerPresence";
import { useSessionId } from "@/hooks/useSessionId";
import { cn } from "@/lib/utils";

type Participant = Doc<"participants">;

export default function RaceActive() {
  const { raceId } = useParams<{ raceId: string }>();
  const sessionId = useSessionId();
  const roomId = raceId as Id<"rooms"> | undefined;
  const room = useQuery(api.rooms.getById, roomId ? { roomId } : "skip");
  const participants = useQuery(api.participants.listByRoom, room ? { roomId: room._id } : "skip");
  const participant = useQuery(api.participants.getBySession, room ? { roomId: room._id, sessionId } : "skip");

  if (!raceId || room === null)
    return <RaceState title="Race not found" description="This room may have expired or been removed." />;
  if (room === undefined || participants === undefined || participant === undefined)
    return <RaceState loading title="Loading race…" />;
  if (room.gameMode !== "race") return <RaceState title="This is not a race room" />;
  if (!participant?.isConnected)
    return (
      <RaceState title="You are not connected to this race">
        <Link className="inline-flex items-center gap-2 font-semibold underline underline-offset-4" to={`/race?code=${encodeURIComponent(room.code)}`}>
          <SignInIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>Rejoin room {room.code}</span>
        </Link>
      </RaceState>
    );
  if (!room.raceStartTime || !room.targetText)
    return (
      <RaceState title="The race has not started">
        <Link className="inline-flex items-center gap-2 font-semibold underline underline-offset-4" to={`/race/lobby/${room._id}`}>
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
      sessionId={sessionId}
    />
  );
}

/** Leave, behind a confirmation; Escape anywhere on the page opens it too. */
function LeaveRaceDialog({ open, onOpenChange, isLeaving, leaveError, onLeave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLeaving: boolean;
  leaveError: string;
  onLeave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isLeaving) onOpenChange(next); }}>
      <DialogTrigger asChild>
        <button type="button" className={RACE_OUTLINE_BUTTON}>
          <SignOutIcon className="size-4" aria-hidden="true" />
          Leave race
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isLeaving}>
        <DialogTitle>Leave this race?</DialogTitle>
        <DialogDescription>You will disconnect from the race. Other racers can keep going.</DialogDescription>
        <RaceError>{leaveError}</RaceError>
        <DialogFooter>
          <button type="button" disabled={isLeaving} onClick={() => onOpenChange(false)} className={cn(RACE_OUTLINE_BUTTON, "text-foreground")}>
            <PlayIcon weight="fill" className="size-4" aria-hidden="true" />
            Keep racing
          </button>
          <button type="button" disabled={isLeaving} onClick={onLeave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
            {isLeaving ? <CircleNotchIcon className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <SignOutIcon className="size-4" aria-hidden="true" />}
            {isLeaving ? "Leaving…" : "Leave"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RaceAttempt({
  room,
  participants,
  participant,
  sessionId,
}: {
  room: Doc<"rooms">;
  participants: Participant[];
  participant: Participant;
  sessionId: string;
}) {
  const credential = useMultiplayerCredential();
  useMultiplayerPresence(participant._id ? room._id : undefined, participant._id);
  const navigate = useNavigate();
  const participantId = participant._id;
  const raceStartTime = room.raceStartTime!;
  const resetVersion = participant.resetVersion ?? 0;
  const [initial] = useState(() => ({
    input: participant.typedText ?? "",
    elapsedMs: participant.stats.timeElapsed,
    legacy:
      participant.typedText === undefined &&
      ((participant.typedProgress ?? 0) > 0 || participant.stats.progress > 0 || participant.stats.timeElapsed > 0) &&
      !participant.stats.isFinished,
  }));
  const [localStats, setLocalStats] = useState<TypingStats | null>(null);
  const [finishStats, setFinishStats] = useState<TypingStats | null>(null);
  const [finishError, setFinishError] = useState("");
  const [finishPending, setFinishPending] = useState(false);
  const [finishRetryDelay, setFinishRetryDelay] = useState<number | null>(null);
  const finishGuard = useRef(false);
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
    now >= raceStartTime && !room.raceEndTime && !finishStats && !participant.stats.isFinished && !initial.legacy && !isLeaving;
  const { report, flush, cancel, progressError } = useRaceProgress(participantId, raceStartTime, resetVersion, active);
  const connected = participants.filter((racer) => racer.isConnected);
  const finishers = connected.filter((racer) => racer.stats.isFinished);
  // Departing finishers still count toward the original final-race deadline.
  const finishTimes = participants
    .filter((racer) => racer.stats.isFinished)
    .flatMap((racer) => (racer.finishTime === undefined ? [] : [racer.finishTime]))
    .sort((a, b) => a - b);
  const deadline = finishTimes.length >= 3 ? raceStartTime + finishTimes[2] + RACE_DEADLINE_MS : null;
  const remaining = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const shouldEnd = (connected.length > 0 && finishers.length === connected.length) || remaining === 0;
  const countdown = now < raceStartTime ? Math.ceil((raceStartTime - now) / 1000) : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room.raceEndTime && !isLeaving) navigate(`/race/results/${room._id}`, { replace: true });
  }, [room.raceEndTime, room._id, navigate, isLeaving]);

  const finishRace = useCallback(() => {
    if (endGuard.current || isLeaving) return;
    endGuard.current = true;
    return endRace({ credential, roomId: room._id, raceStartTime }).catch(() => {
      setEndError("Could not finalize the race. Retry to prepare the results.");
    });
  }, [credential, endRace, room._id, raceStartTime, isLeaving]);

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
      cancel();
      setFinishStats(stats);
      setFinishPending(true);
      setFinishRetryDelay(null);
      setFinishError("");
      try {
        const result = await recordFinish({
          credential,
          participantId,
          raceStartTime,
          resetVersion,
          typedText: stats.typedText,
          typedProgress: stats.correctChars,
          stats: { ...raceStats(stats), isFinished: true },
        });
        if (!result?.accepted) {
          finishGuard.current = false;
          if (result?.reason === "not_started") {
            setFinishError("Waiting for the server race clock before saving your finish.");
            setFinishRetryDelay(Math.max(50, result.retryAfterMs ?? 250) + 50);
          } else {
            setFinishError("This attempt is no longer active. Return to the race lobby.");
          }
        }
      } catch {
        finishGuard.current = false;
        setFinishError("Your finish could not be saved. Retry to record your result.");
      } finally {
        setFinishPending(false);
      }
    },
    [credential, cancel, participantId, raceStartTime, resetVersion, recordFinish],
  );

  useEffect(() => {
    if (finishRetryDelay === null || !finishStats) return;
    const timer = window.setTimeout(() => void handleFinish(finishStats), finishRetryDelay);
    return () => window.clearTimeout(timer);
  }, [finishRetryDelay, finishStats, handleFinish]);

  useEffect(() => {
    if (showLeave) return;
    const openLeave = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setShowLeave(true);
    };
    window.addEventListener("keydown", openLeave);
    return () => window.removeEventListener("keydown", openLeave);
  }, [showLeave]);

  const ranked = rankLiveRacers(
    [...connected].sort((a, b) => a.joinedAt - b.joinedAt).map((racer, lane) => {
      const isYou = racer._id === participantId;
      return {
        id: racer._id,
        name: racer.name,
        emoji: racer.emoji || DEFAULT_RACE_EMOJI,
        color: racerColor(racer.sessionId, racer.sessionId === sessionId),
        progress: isYou ? (localStats?.progress ?? racer.stats.progress) : racer.stats.progress,
        wpm: isYou ? (localStats?.wpm ?? racer.stats.wpm) : racer.stats.wpm,
        isFinished: racer.stats.isFinished,
        position: racer.position,
        isYou,
        lane,
      };
    }),
  );
  const racers: LiveRacer[] = ranked.map((racer, index) => ({ ...racer, place: racer.isFinished ? (racer.position ?? index + 1) : index + 1 }));
  const liveWpm = localStats?.wpm ?? participant.stats.wpm;
  const liveAccuracy = localStats?.accuracy ?? participant.stats.accuracy;
  const finished = Boolean(finishStats || participant.stats.isFinished);
  const elapsed = Math.max(0, (room.raceEndTime ?? now) - raceStartTime);

  return (
    <RaceShell className="max-w-6xl gap-5" footer={false}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <h1 className="flex items-center gap-2 text-lg font-black text-foreground">
            <FlagCheckeredIcon weight="fill" className="size-5 text-primary" aria-hidden="true" />
            Lap {countdown !== null ? 0 : 1}/1
          </h1>
          <span className="inline-flex items-center gap-1 tabular-nums"><TimerIcon className="size-4" aria-hidden="true" />{formatRaceTime(countdown !== null ? 0 : elapsed)}</span>
          <span role="status" className="flex flex-wrap items-center gap-x-3">
            <span>{finishers.length} / {connected.length} finished</span>
            {remaining !== null && <span className="font-semibold text-warning">Closing in {remaining}s</span>}
          </span>
        </div>
        <LeaveRaceDialog open={showLeave} onOpenChange={setShowLeave} isLeaving={isLeaving} leaveError={leaveError}
          onLeave={async () => {
            await flush();
            await leave();
          }} />
      </header>
      {(endError || progressError) && (
        <div className="flex flex-col items-start gap-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <RaceError>{endError}</RaceError>
          {endError && (
            <button type="button" className={RACE_RETRY_BUTTON}
              onClick={() => {
                setEndError("");
                endGuard.current = false;
                void finishRace();
              }}>
              <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
              Retry results
            </button>
          )}
          <RaceError>{progressError}</RaceError>
          {progressError && (
            <button type="button" className={RACE_RETRY_BUTTON} onClick={() => void flush()}>
              <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
              Retry sync
            </button>
          )}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <LiveTrack racers={racers} countdown={countdown} />
          <section aria-label="Your lap" className="min-w-0 space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Your lap</h2>
              <span className="text-xs text-muted-foreground">
                <strong className="text-sm tabular-nums text-foreground">{liveWpm}</strong> WPM · <strong className="text-sm tabular-nums text-foreground">{liveAccuracy}%</strong> accuracy
              </span>
            </div>
            {initial.legacy ? (
              <div className="flex flex-col items-start gap-3">
                <h3 className="text-xl font-bold">Restart this attempt</h3>
                <p className="text-muted-foreground">This older attempt saved your progress but not your exact input. Restart from the beginning to continue this race.</p>
                <RaceError>{resetError}</RaceError>
                <button type="button" disabled={resetPending} className={cn(RACE_PRIMARY_BUTTON, "h-11 px-5")}
                  onClick={async () => {
                    setResetPending(true);
                    setResetError("");
                    try {
                      await resetStats({ credential, participantId });
                    } catch {
                      setResetError("Could not restart your attempt. Try again.");
                      setResetPending(false);
                    }
                  }}>
                  {resetPending ? <CircleNotchIcon className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-5" aria-hidden="true" />}
                  {resetPending ? "Restarting…" : "Restart my attempt"}
                </button>
              </div>
            ) : finished ? (
              <motion.div initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={RACE_SPRING} role="status"
                className="flex flex-col items-start gap-1 rounded-2xl bg-primary/10 p-4">
                <h3 className="text-xl font-black">
                  {finishPending ? "Saving your finish…" : participant.stats.isFinished ? "You finished!" : "Finish needs saving"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {participant.position ? `You came ${ordinal(participant.position)}. ` : ""}Waiting for the others…
                </p>
                <RaceError>{finishError}</RaceError>
                {finishError && finishStats && finishRetryDelay === null && (
                  <button type="button" disabled={finishPending} className={RACE_RETRY_BUTTON} onClick={() => void handleFinish(finishStats)}>
                    <WarningCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                    Retry saving finish
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                {countdown !== null && <p role="status" className="text-center text-sm font-semibold text-primary">Starting in {countdown}…</p>}
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
        </div>
        <LiveStandings racers={racers} />
      </div>
    </RaceShell>
  );
}
