import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowClockwiseIcon, ArrowLeftIcon, CircleNotchIcon, FloppyDiskIcon, TrophyIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BOUNCY_SPRING, formatRaceTime, ordinal } from "@/components/race/race-format";
import { LeaveButton, RACE_PRIMARY_BUTTON } from "@/components/race/RaceParts";
import { RacePodium, RaceResultList, type RaceRanking } from "@/components/race/RaceStandings";
import RaceState, { RaceError, RaceShell } from "@/components/race/RaceState";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useMultiplayerPresence } from "@/hooks/useMultiplayerPresence";
import { useSessionId } from "@/hooks/useSessionId";

function headline(me: RaceRanking | undefined) {
  if (!me) return "Race results";
  if (!me.didFinish) return "Out of time";
  return me.position === 1 ? "You won!" : `You came ${ordinal(me.position)}`;
}

export default function RaceResults() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const credential = useMultiplayerCredential();
  const roomId = raceId as Id<"rooms"> | undefined;
  const room = useQuery(api.rooms.getById, roomId ? { roomId } : "skip");
  const results = useQuery(
    api.raceResults.getResults,
    room ? { raceId: room._id } : "skip",
  );
  const participant = useQuery(
    api.participants.getBySession,
    room ? { roomId: room._id, sessionId } : "skip",
  );
  const resetForNewRace = useMutation(api.rooms.resetForNewRace);
  const saveResults = useMutation(api.raceResults.saveResults);
  const { leave, isLeaving, leaveError } = useRaceDeparture(participant?._id);
  useMultiplayerPresence(participant?._id ? room?._id : undefined, participant?._id);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState("");
  const isHost = room?.hostId === sessionId;
  const userRanking = results?.rankings.find(
    (racer) => racer.sessionId === sessionId,
  );

  useEffect(() => {
    if (
      room?.status === "waiting" &&
      !room.raceStartTime &&
      participant?.isConnected &&
      !isLeaving
    )
      navigate(`/race/lobby/${raceId}`, { replace: true });
  }, [
    room?.status,
    room?.raceStartTime,
    participant?.isConnected,
    isLeaving,
    raceId,
    navigate,
  ]);

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    if (pendingRef.current || isLeaving) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch {
      setError(message);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (!raceId || room === null)
    return (
      <RaceState
        title="Race not found"
        description="This room may have expired or been removed."
      />
    );
  if (room === undefined || results === undefined || participant === undefined)
    return <RaceState loading title="Loading results…" />;
  if (room.gameMode !== "race")
    return <RaceState title="This is not a race room" />;
  if (!results)
    return (
      <RaceState
        title={
          room.raceEndTime
            ? "Results are not available yet"
            : "This race has not ended"
        }
        description={
          room.raceEndTime
            ? "The race ended, but its results have not been saved."
            : "Results appear after the race finishes."
        }
      >
        <div className="flex flex-col items-center gap-3">
          <RaceError>{error || leaveError}</RaceError>
          {room.raceEndTime ? (
            <button
              type="button"
              disabled={pending || isLeaving}
              className={`${RACE_PRIMARY_BUTTON} h-11 px-5`}
              onClick={() =>
                void runAction(
                  () =>
                    saveResults({ credential,
                      raceId: room._id,
                      raceStartTime: room.raceStartTime,
                    }),
                  "Could not prepare results. Try again.",
                )
              }
            >
              {pending ? <CircleNotchIcon className="size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <FloppyDiskIcon className="size-5 shrink-0" aria-hidden="true" />}
              {pending ? "Preparing…" : "Prepare results"}
            </button>
          ) : (
            <Link
              className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
              to={
                room.raceStartTime
                  ? `/race/${room._id}`
                  : `/race/lobby/${room._id}`
              }
            >
              <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>Return to {room.raceStartTime ? "race" : "lobby"}</span>
            </Link>
          )}
          <LeaveButton onLeave={() => void leave()} leaving={isLeaving} disabled={pending} />
        </div>
      </RaceState>
    );

  const host = results.rankings.find((ranking) => ranking.sessionId === room.hostId);
  return (
    <RaceShell className="max-w-3xl gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <motion.span initial={{ scale: 0.5, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={BOUNCY_SPRING}
          className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <TrophyIcon weight="fill" className="size-7" aria-hidden="true" />
        </motion.span>
        <h1 className="text-3xl font-black sm:text-4xl">{headline(userRanking)}</h1>
        {userRanking ? (
          <ul className="flex flex-wrap justify-center gap-2 text-sm" aria-label="Your race">
            {[
              [`${ordinal(userRanking.position)}`, `of ${results.totalRacers}`],
              [`${userRanking.wpm}`, "WPM"],
              [`${userRanking.accuracy}%`, "accuracy"],
              [userRanking.didFinish && userRanking.finishTime !== undefined ? formatRaceTime(userRanking.finishTime) : "DNF", "time"],
            ].map(([value, label]) => (
              <li key={label} className="rounded-full border border-border bg-card px-3 py-1.5"><strong className="tabular-nums">{value}</strong> <span className="text-muted-foreground">{label}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{results.totalRacers} racers</p>}
      </header>
      <RacePodium rankings={results.rankings} currentSessionId={sessionId} />
      <RaceResultList rankings={results.rankings} currentSessionId={sessionId} hostId={room.hostId} />
      <RaceError className="text-center">{error || leaveError}</RaceError>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {isHost && participant?.isConnected ? (
          <button type="button" disabled={pending || isLeaving} className={RACE_PRIMARY_BUTTON}
            onClick={() => void runAction(() => resetForNewRace({ credential, roomId: room._id, hostSessionId: sessionId }), "Could not reset this race. Try again.")}>
            {pending ? <CircleNotchIcon className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-5" aria-hidden="true" />}
            {pending ? "Resetting…" : "Race again"}
          </button>
        ) : participant?.isConnected ? (
          <p className="text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">Waiting for {host?.name ?? room.hostName ?? "the host"} to start another race…</p>
        ) : null}
        <LeaveButton onLeave={() => void leave()} leaving={isLeaving} disabled={pending} className="h-12 px-6" />
      </div>
    </RaceShell>
  );
}
