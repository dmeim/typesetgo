import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { RotateCw, LogOut, Trophy, ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Podium } from "@/components/race";
import RaceState, { RaceError } from "@/components/race/RaceState";
import { useRaceDeparture } from "@/components/race/useRaceDeparture";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";

export default function RaceResults() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const sessionId = useSessionId();
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
        <div className="space-y-4">
          <RaceError>{error || leaveError}</RaceError>
          {room.raceEndTime ? (
            <button
              disabled={pending || isLeaving}
              className="inline-flex items-center justify-center gap-2 mx-auto underline"
              onClick={() =>
                void runAction(
                  () =>
                    saveResults({
                      raceId: room._id,
                      raceStartTime: room.raceStartTime,
                    }),
                  "Could not prepare results. Try again.",
                )
              }
            >
              {pending ? <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Save className="size-4 shrink-0" aria-hidden="true" />}
              {pending ? "Preparing…" : "Prepare results"}
            </button>
          ) : (
            <Link
              className="inline-flex items-center gap-2 underline"
              to={
                room.raceStartTime
                  ? `/race/${room._id}`
                  : `/race/lobby/${room._id}`
              }
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              <span>Return to {room.raceStartTime ? "race" : "lobby"}</span>
            </Link>
          )}
          <button
            disabled={isLeaving || pending}
            className="inline-flex items-center justify-center gap-2 underline"
            onClick={() => void leave()}
          >
            {isLeaving ? <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <LogOut className="size-4 shrink-0" aria-hidden="true" />}
            {isLeaving ? "Leaving…" : "Leave Race"}
          </button>
        </div>
      </RaceState>
    );

  return (
    <main
      className="min-h-screen px-4 py-6 sm:py-10"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      <div className="max-w-5xl mx-auto min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold inline-flex items-center gap-2">
            <Trophy size={24} />
            Race Results
          </h1>
          <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
            {results.totalRacers} racers
          </p>
        </header>
        <div
          className={`grid gap-6 mb-6 ${userRanking ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]" : "grid-cols-1"}`}
        >
          {userRanking && (
            <section
              aria-label="Your result"
              className="min-w-0 flex flex-wrap lg:flex-col gap-4"
            >
              <div
                className="flex-1 rounded-xl border p-5 text-center"
                style={{
                  borderColor: tv.ui.border,
                  backgroundColor: tv.ui.card,
                }}
              >
                <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                  Your position
                </p>
                <p
                  className="text-5xl font-bold my-2"
                  style={{ color: tv.ui.primary }}
                >
                  #{userRanking.position}
                </p>
                <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                  {userRanking.didFinish
                    ? `of ${results.totalRacers} racers`
                    : "Did not finish"}
                </p>
              </div>
              <div
                className="flex-1 rounded-xl border p-5 text-center"
                style={{
                  borderColor: tv.ui.border,
                  backgroundColor: tv.ui.card,
                }}
              >
                <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                  Your speed
                </p>
                <p
                  className="text-5xl font-bold my-2"
                  style={{ color: tv.ui.primary }}
                >
                  {userRanking.wpm}
                </p>
                <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                  words per minute
                </p>
              </div>
            </section>
          )}
          <section
            aria-label="Race podium"
            className="min-w-0 flex items-center rounded-xl border p-3 sm:p-6"
            style={{ borderColor: tv.ui.border, backgroundColor: tv.ui.card }}
          >
            <Podium
              rankings={results.rankings}
              currentSessionId={sessionId}
              showTable={false}
            />
          </section>
        </div>
        <Podium
          rankings={results.rankings}
          currentSessionId={sessionId}
          showPodium={false}
        />
        <RaceError>{error || leaveError}</RaceError>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {isHost && participant?.isConnected ? (
            <button
              disabled={pending || isLeaving}
              onClick={() =>
                void runAction(
                  () =>
                    resetForNewRace({
                      roomId: room._id,
                      hostSessionId: sessionId,
                    }),
                  "Could not reset this race. Try again.",
                )
              }
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
              style={{
                backgroundColor: tv.ui.primary,
                color: tv.ui.primaryForeground,
              }}
            >
              <RotateCw size={18} />
              {pending ? "Resetting…" : "Race Again"}
            </button>
          ) : participant?.isConnected ? (
            <p
              className="text-sm text-center"
              style={{ color: tv.ui.mutedForeground }}
            >
              Waiting for the host to start a new race.
            </p>
          ) : null}
          <button
            disabled={isLeaving || pending}
            onClick={() => void leave()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: tv.ui.secondary }}
          >
            <LogOut size={18} />
            {isLeaving ? "Leaving…" : "Leave Race"}
          </button>
        </div>
      </div>
    </main>
  );
}
