import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Copy, CopyCheck, Settings, Users, LogOut, LogIn, RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PlayerCard } from "@/components/race";
import RaceState, { RaceError } from "@/components/race/RaceState";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";

const DIFFICULTIES = ["beginner", "easy", "medium", "hard", "expert"];
const WORD_COUNTS = [10, 15, 25, 50, 100];

export default function RaceLobby() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const roomId = lobbyId as Id<"rooms"> | undefined;
  const room = useQuery(api.rooms.getById, roomId ? { roomId } : "skip");
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip",
  );
  const currentParticipant = useQuery(
    api.participants.getBySession,
    room ? { roomId: room._id, sessionId } : "skip",
  );
  const updateSettings = useMutation(api.rooms.updateSettings);
  const setReady = useMutation(api.participants.setReady);
  const setNotReady = useMutation(api.participants.setNotReady);
  const setEmoji = useMutation(api.participants.setEmoji);
  const setName = useMutation(api.participants.setName);
  const startRace = useMutation(api.rooms.startRace);
  const { leave, isLeaving, leaveError } = useRaceDeparture(
    currentParticipant?._id,
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now);
  const startAttempted = useRef<number | null>(null);
  const isHost = room?.hostId === sessionId;
  const connectedParticipants =
    participants?.filter((participant) => participant.isConnected) || [];
  const allReady =
    connectedParticipants.length > 0 &&
    connectedParticipants.every((participant) => participant.isReady);
  const starting = room?.status === "active" && !!room.raceStartTime;
  const countdown = starting
    ? Math.max(0, Math.ceil((room.raceStartTime! - now) / 1000))
    : null;
  const participantId = currentParticipant?._id;
  const isReady = currentParticipant?.isReady;

  const canAutoStart = Boolean(
    allReady &&
    room?.status === "waiting" &&
    currentParticipant?.isConnected &&
    isHost &&
    !isLeaving,
  );
  const startIdentity = `${roomId ?? ""}:${canAutoStart}`;
  const [startState, setStartState] = useState({
    identity: startIdentity,
    attempt: 0,
    error: "",
  });
  // A changed ready barrier is a new automatic attempt. Errors belong only to
  // the barrier that produced them, including responses arriving after a leave.
  if (startState.identity !== startIdentity) {
    setStartState({
      identity: startIdentity,
      attempt: startState.attempt + 1,
      error: "",
    });
  }
  const startError = startState.error;
  const startAttempt = startState.attempt;

  const beginRace = useCallback(() => {
    if (!roomId || !canAutoStart || startAttempted.current === startAttempt)
      return;
    startAttempted.current = startAttempt;
    return startRace({ roomId, hostSessionId: sessionId }).catch(() => {
      setStartState((current) =>
        current.attempt === startAttempt
          ? {
              ...current,
              error: "The race could not start. Retry when everyone is ready.",
            }
          : current,
      );
    });
  }, [roomId, canAutoStart, startAttempt, sessionId, startRace]);

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
    if (room?.raceEndTime)
      navigate(`/race/results/${lobbyId}`, { replace: true });
    else if (countdown === 0) navigate(`/race/${lobbyId}`, { replace: true });
  }, [
    countdown,
    room?.raceEndTime,
    lobbyId,
    navigate,
    isLeaving,
    currentParticipant?.isConnected,
  ]);

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
    return (
      <RaceState
        title="Room not found"
        description="This race may have expired or been removed."
      />
    );
  if (
    room === undefined ||
    participants === undefined ||
    currentParticipant === undefined
  )
    return <RaceState loading title="Loading lobby…" />;
  if (room.gameMode !== "race")
    return (
      <RaceState
        title="This is not a race room"
        description="Use Connect to join a practice room."
      />
    );
  if (!currentParticipant?.isConnected)
    return (
      <RaceState
        title="Join this race to continue"
        description="You are not connected to this room."
      >
        <Link
          className="inline-flex items-center gap-2 underline"
          to={`/race?code=${encodeURIComponent(room.code)}`}
        >
          <LogIn className="size-4 shrink-0" aria-hidden="true" />
          <span>Join room {room.code}</span>
        </Link>
      </RaceState>
    );

  const locked = starting || pending || isLeaving;
  return (
    <main
      className="min-h-screen px-4 py-6 sm:py-10"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Race lobby</h1>
            <p
              className="text-sm mt-1"
              style={{ color: tv.ui.mutedForeground }}
            >
              Choose your avatar, then ready up.
            </p>
          </div>
          <button
            onClick={() => void leave()}
            disabled={isLeaving || pending}
            className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border disabled:opacity-50"
            style={{ borderColor: tv.ui.border }}
          >
            <LogOut size={16} aria-hidden="true" />
            {isLeaving ? "Leaving…" : "Leave Race"}
          </button>
        </header>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(room.code);
                setCopied(true);
              } catch {
                setError(
                  "Could not copy the room code. Select and copy the code below.",
                );
              }
            }}
            aria-label={`Copy room code ${room.code}`}
            className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ borderColor: tv.ui.border, backgroundColor: tv.ui.card }}
          >
            {copied ? <CopyCheck className="size-4 shrink-0" aria-hidden="true" /> : <Copy className="size-4 shrink-0" aria-hidden="true" />}
            <span className="text-sm">Room code</span>
            <span
              className="font-mono font-bold tracking-widest"
              style={{ color: tv.ui.primary }}
            >
              {room.code}
            </span>
          </button>
          <span
            role="status"
            className="text-sm"
            style={{ color: tv.ui.mutedForeground }}
          >
            {copied
              ? "Copied"
              : starting
                ? `Race starts in ${countdown}…`
                : "The race starts when everyone is ready."}
          </span>
        </div>
        <RaceError>{leaveError || error}</RaceError>
        {startError && (
          <div>
            <RaceError>{startError}</RaceError>
            <button
              disabled={!allReady || locked}
              onClick={() => {
                setStartState((current) => ({ ...current, error: "" }));
                startAttempted.current = null;
                void beginRace();
              }}
              className="inline-flex items-center justify-center gap-2 underline mb-4 disabled:opacity-50"
            >
              <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
              Retry race start
            </button>
          </div>
        )}
        <div
          className={`grid gap-6 ${isHost ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "grid-cols-1"}`}
        >
          {isHost && (
            <section
              className="min-w-0 rounded-xl border p-4 sm:p-6"
              style={{ borderColor: tv.ui.border, backgroundColor: tv.ui.card }}
            >
              <h2 className="font-semibold text-lg flex items-center gap-2 mb-5">
                <Settings size={18} />
                Race Settings
              </h2>
              <fieldset disabled={locked} className="mb-6">
                <legend className="text-sm mb-2">Difficulty</legend>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty}
                      aria-pressed={room.settings.difficulty === difficulty}
                      className="capitalize px-3 py-2 rounded-md text-sm disabled:opacity-50"
                      style={{
                        backgroundColor:
                          room.settings.difficulty === difficulty
                            ? tv.ui.primary
                            : tv.ui.secondary,
                        color:
                          room.settings.difficulty === difficulty
                            ? tv.ui.primaryForeground
                            : tv.ui.foreground,
                      }}
                      onClick={() =>
                        void runAction(
                          () =>
                            updateSettings({
                              roomId: room._id,
                              hostSessionId: sessionId,
                              settings: { difficulty },
                            }),
                          "Could not update difficulty. Try again.",
                        )
                      }
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={locked}>
                <legend className="text-sm mb-2">Word count</legend>
                <div className="flex flex-wrap gap-2">
                  {WORD_COUNTS.map((wordTarget) => (
                    <button
                      key={wordTarget}
                      aria-pressed={room.settings.wordTarget === wordTarget}
                      className="px-3 py-2 rounded-md text-sm disabled:opacity-50"
                      style={{
                        backgroundColor:
                          room.settings.wordTarget === wordTarget
                            ? tv.ui.primary
                            : tv.ui.secondary,
                        color:
                          room.settings.wordTarget === wordTarget
                            ? tv.ui.primaryForeground
                            : tv.ui.foreground,
                      }}
                      onClick={() =>
                        void runAction(
                          () =>
                            updateSettings({
                              roomId: room._id,
                              hostSessionId: sessionId,
                              settings: { wordTarget },
                            }),
                          "Could not update word count. Try again.",
                        )
                      }
                    >
                      {wordTarget}
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
          )}
          <section
            className="min-w-0 rounded-xl border p-4 sm:p-6"
            style={{ borderColor: tv.ui.border, backgroundColor: tv.ui.card }}
          >
            <div className="flex flex-wrap justify-between gap-2 mb-5">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users size={18} />
                Racers ({connectedParticipants.length})
              </h2>
              <span
                className="text-sm"
                style={{ color: tv.ui.mutedForeground }}
              >
                {
                  connectedParticipants.filter(
                    (participant) => participant.isReady,
                  ).length
                }{" "}
                / {connectedParticipants.length} ready
              </span>
            </div>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
              {connectedParticipants.map((participant) => (
                <PlayerCard
                  key={participant._id}
                  name={participant.name}
                  emoji={participant.emoji || "🏎️"}
                  isReady={!!participant.isReady}
                  isHost={participant.sessionId === room.hostId}
                  isCurrentUser={participant.sessionId === sessionId}
                  isCountingDown={starting}
                  countdownValue={countdown ?? undefined}
                  pending={pending || isLeaving}
                  onReadyToggle={
                    participantId
                      ? () =>
                          void runAction(
                            () =>
                              isReady
                                ? setNotReady({ participantId })
                                : setReady({ participantId }),
                            "Could not update readiness. Try again.",
                          )
                      : undefined
                  }
                  onEmojiChange={
                    participantId
                      ? (emoji) =>
                          void runAction(
                            () => setEmoji({ participantId, emoji }),
                            "Could not update your avatar. Try again.",
                          )
                      : undefined
                  }
                  onNameChange={
                    participantId
                      ? (name) =>
                          runAction(
                            () => setName({ participantId, name }),
                            "Could not save your name. Your draft is still available.",
                          )
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
