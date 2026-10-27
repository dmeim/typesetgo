import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsClockwiseIcon, ArrowUUpLeftIcon, CircleNotchIcon, FlagCheckeredIcon, SignInIcon, SlidersHorizontalIcon, TimerIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { LobbyRacerList, type LobbyRacer } from "@/components/race/LobbyRacerList";
import { BOUNCY_SPRING, DEFAULT_RACE_EMOJI, RACE_DIFFICULTIES, RACE_WORD_COUNTS, racerColor } from "@/components/race/race-format";
import { CopyCodeButton, LeaveButton, RACE_PRIMARY_BUTTON, RACE_RETRY_BUTTON } from "@/components/race/RaceParts";
import RaceState, { RaceError, RaceShell } from "@/components/race/RaceState";
import { MapDot, TrackMap } from "@/components/race/TrackMap";
import { MAP_LIMIT, gridSlot, pitSlot } from "@/components/race/track-geometry";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useMultiplayerPresence } from "@/hooks/useMultiplayerPresence";
import { useSessionId } from "@/hooks/useSessionId";
import { cn } from "@/lib/utils";

const select = "h-10 w-full min-w-0 rounded-full border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

/** Ready racers roll out to the grid behind the line; everyone else waits in the pit lane. */
function StartingLine({ racers, countdown }: { racers: LobbyRacer[]; countdown: number | null }) {
  // You always get a spot on the map, even in a full room.
  const ordered = [...racers].sort((a, b) => Number(b.isYou) - Number(a.isYou));
  const ready = ordered.filter((racer) => racer.isReady);
  const waiting = ordered.filter((racer) => !racer.isReady);
  const hidden = Math.max(0, ready.length - MAP_LIMIT) + Math.max(0, waiting.length - MAP_LIMIT);
  return (
    <section aria-label="Starting line" className="relative flex min-w-0 flex-col justify-center rounded-3xl border border-border bg-card p-3 sm:p-6">
      <TrackMap className="mx-auto max-w-2xl" hidden={hidden}
        label={`${ready.length} ${ready.length === 1 ? "racer" : "racers"} on the starting grid, ${waiting.length} still in the pit lane`}
        infieldClassName="inset-y-auto top-[30%] h-[22%]"
        infield={(
          <span className="flex flex-col items-center gap-0.5 text-[clamp(0.55rem,2.4cqw,0.75rem)] font-bold uppercase tracking-widest text-muted-foreground">
            Pit lane<span className="hidden font-normal normal-case tracking-normal @md:block">Ready racers roll out to the line</span>
          </span>
        )}>
        {waiting.slice(0, MAP_LIMIT).map((racer, index) => (
          <MapDot key={racer.id} point={pitSlot(index, waiting.length)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} dim />
        ))}
        {ready.slice(0, MAP_LIMIT).map((racer, index) => (
          <MapDot key={racer.id} point={gridSlot(index)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} />
        ))}
      </TrackMap>
      <AnimatePresence>
        {countdown !== null && (
          <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl bg-card/75 backdrop-blur-[1px]">
            <span className="text-sm font-semibold text-muted-foreground">Race starts in</span>
            <AnimatePresence mode="popLayout">
              <motion.span key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={BOUNCY_SPRING}
                className="text-7xl font-black tabular-nums text-primary sm:text-9xl">
                {Math.max(1, countdown)}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TrackSetup({ room, isHost, disabled, onChange }: {
  room: Doc<"rooms">;
  isHost: boolean;
  disabled: boolean;
  onChange: (settings: { difficulty?: string; wordTarget?: number }) => void;
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
      <h2 id={`${id}-title`} className="flex items-center gap-2 font-bold"><SlidersHorizontalIcon className="size-5" aria-hidden="true" />Track setup</h2>
      {!isHost && <p className="-mt-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">{room.hostName || "The host"} sets the track.</p>}
      <label className="flex flex-col gap-1 text-sm font-semibold">Difficulty
        <select value={room.settings.difficulty} disabled={!isHost || disabled} onChange={(event) => onChange({ difficulty: event.target.value })} className={`${select} capitalize`}>
          {RACE_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Lap length
        <select value={room.settings.wordTarget} disabled={!isHost || disabled} onChange={(event) => onChange({ wordTarget: Number(event.target.value) })} className={select}>
          {RACE_WORD_COUNTS.map((words) => <option key={words} value={words}>{words} words</option>)}
        </select>
      </label>
    </section>
  );
}

export default function RaceLobby() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const credential = useMultiplayerCredential();
  const roomId = lobbyId as Id<"rooms"> | undefined;
  const room = useQuery(api.rooms.getById, roomId ? { roomId } : "skip");
  const participants = useQuery(api.participants.listByRoom, room ? { roomId: room._id } : "skip");
  const currentParticipant = useQuery(api.participants.getBySession, room ? { roomId: room._id, sessionId } : "skip");
  const updateSettings = useMutation(api.rooms.updateSettings);
  const setReady = useMutation(api.participants.setReady);
  const setNotReady = useMutation(api.participants.setNotReady);
  const setEmoji = useMutation(api.participants.setEmoji);
  const setName = useMutation(api.participants.setName);
  const startRace = useMutation(api.rooms.startRace);
  const { leave, isLeaving, leaveError } = useRaceDeparture(currentParticipant?._id);
  useMultiplayerPresence(currentParticipant?._id ? room?._id : undefined, currentParticipant?._id);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now);
  const startAttempted = useRef<number | null>(null);
  const isHost = room?.hostId === sessionId;
  const connectedParticipants = participants?.filter((participant) => participant.isConnected) || [];
  const allReady = connectedParticipants.length > 0 && connectedParticipants.every((participant) => participant.isReady);
  const starting = room?.status === "active" && !!room.raceStartTime;
  const countdown = starting ? Math.max(0, Math.ceil((room.raceStartTime! - now) / 1000)) : null;
  const participantId = currentParticipant?._id;
  const isReady = currentParticipant?.isReady;

  const canAutoStart = Boolean(allReady && room?.status === "waiting" && currentParticipant?.isConnected && isHost && !isLeaving);
  const startIdentity = `${roomId ?? ""}:${canAutoStart}`;
  const [startState, setStartState] = useState({ identity: startIdentity, attempt: 0, error: "" });
  // A changed ready barrier is a new automatic attempt. Errors belong only to
  // the barrier that produced them, including responses arriving after a leave.
  if (startState.identity !== startIdentity) {
    setStartState({ identity: startIdentity, attempt: startState.attempt + 1, error: "" });
  }
  const startError = startState.error;
  const startAttempt = startState.attempt;

  const beginRace = useCallback(() => {
    if (!roomId || !canAutoStart || startAttempted.current === startAttempt) return;
    startAttempted.current = startAttempt;
    return startRace({ credential, roomId, hostSessionId: sessionId }).catch(() => {
      setStartState((current) =>
        current.attempt === startAttempt ? { ...current, error: "The race could not start. Retry when everyone is ready." } : current);
    });
  }, [credential, roomId, canAutoStart, startAttempt, sessionId, startRace, setStartState]);

  useEffect(() => {
    if (canAutoStart) void beginRace();
  }, [canAutoStart, beginRace]);

  useEffect(() => {
    if (!starting || isLeaving) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [starting, isLeaving]);

  useEffect(() => {
    if (isLeaving || !currentParticipant?.isConnected) return;
    if (room?.raceEndTime) navigate(`/race/results/${lobbyId}`, { replace: true });
    else if (countdown === 0) navigate(`/race/${lobbyId}`, { replace: true });
  }, [countdown, room?.raceEndTime, lobbyId, navigate, isLeaving, currentParticipant?.isConnected]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    if (pendingRef.current || starting || isLeaving) return false;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      return true;
    } catch {
      setError(message);
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (!lobbyId || room === null)
    return <RaceState title="Room not found" description="This race may have expired or been removed." />;
  if (room === undefined || participants === undefined || currentParticipant === undefined)
    return <RaceState loading title="Loading lobby…" />;
  if (room.gameMode !== "race")
    return <RaceState title="This is not a race room" description="Use Connect to join a practice room." />;
  if (!currentParticipant?.isConnected)
    return (
      <RaceState title="Join this race to continue" description="You are not connected to this room.">
        <Link className="inline-flex items-center gap-2 font-semibold underline underline-offset-4" to={`/race?code=${encodeURIComponent(room.code)}`}>
          <SignInIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>Join room {room.code}</span>
        </Link>
      </RaceState>
    );

  const locked = starting || pending || isLeaving;
  const readyCount = connectedParticipants.filter((participant) => participant.isReady).length;
  const racers: LobbyRacer[] = connectedParticipants.map((participant) => ({
    id: participant._id,
    name: participant.name,
    emoji: participant.emoji || DEFAULT_RACE_EMOJI,
    color: racerColor(participant.sessionId, participant.sessionId === sessionId),
    isReady: !!participant.isReady,
    isHost: participant.sessionId === room.hostId,
    isYou: participant.sessionId === sessionId,
  }));
  const ReadyIcon = pending ? CircleNotchIcon : starting ? TimerIcon : isReady ? ArrowUUpLeftIcon : FlagCheckeredIcon;

  return (
    <RaceShell className="max-w-6xl gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">Track <span className="tracking-[0.2em] text-primary">{room.code}</span></h1>
          <CopyCodeButton code={room.code} onCopy={(ok) => {
            setCopied(ok);
            if (!ok) setError("Could not copy the room code. Select and copy the code above.");
          }} />
        </div>
        <LeaveButton onLeave={() => void leave()} leaving={isLeaving} disabled={pending} />
      </header>
      <p role="status" className="-mt-2 text-sm text-muted-foreground">
        {copied ? "Room code copied" : starting ? `Race starts in ${countdown}…`
          : isHost ? "Share the code. The race starts when everyone is ready." : "The race starts when everyone is ready."}
      </p>
      {(leaveError || error || startError) && (
        <div className="flex flex-col items-start gap-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <RaceError>{leaveError || error}</RaceError>
          {startError && (
            <>
              <RaceError>{startError}</RaceError>
              <button type="button" disabled={!allReady || locked} className={RACE_RETRY_BUTTON}
                onClick={() => {
                  setStartState((current) => ({ ...current, error: "" }));
                  startAttempted.current = null;
                  void beginRace();
                }}>
                <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                Retry race start
              </button>
            </>
          )}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <StartingLine racers={racers} countdown={countdown} />
        <aside className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="race-lobby-racers" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
            <h2 id="race-lobby-racers" className="flex items-center justify-between gap-2 font-bold">
              Racers<span className="text-xs font-semibold text-muted-foreground">{readyCount}/{connectedParticipants.length} at the line</span>
            </h2>
            <LobbyRacerList racers={racers} pending={pending || isLeaving} locked={starting || isLeaving}
              onEmojiChange={participantId ? (emoji) => void runAction(() => setEmoji({ credential, participantId, emoji }), "Could not update your avatar. Try again.") : undefined}
              onNameChange={participantId ? (name) => runAction(() => setName({ credential, participantId, name }), "Could not save your name. Your draft is still available.") : undefined} />
            {participantId && (
              <button type="button" disabled={locked} aria-pressed={!!isReady}
                onClick={() => void runAction(() => isReady ? setNotReady({ credential, participantId }) : setReady({ credential, participantId }), "Could not update readiness. Try again.")}
                className={cn(RACE_PRIMARY_BUTTON, "h-11 px-5", isReady && "border border-border bg-transparent text-foreground hover:bg-accent hover:opacity-100")}>
                <ReadyIcon className={cn("size-5", pending && "motion-safe:animate-spin")} aria-hidden="true" />
                {pending ? "Saving…" : starting ? `Starting in ${countdown}…` : isReady ? "Back to the pit lane" : "Roll out to the line"}
              </button>
            )}
          </section>
          <TrackSetup room={room} isHost={isHost} disabled={locked}
            onChange={(settings) => void runAction(
              () => updateSettings({ credential, roomId: room._id, hostSessionId: sessionId, settings }),
              settings.difficulty ? "Could not update difficulty. Try again." : "Could not update word count. Try again.",
            )} />
        </aside>
      </div>
    </RaceShell>
  );
}
