// src/pages/RaceResults.tsx
// Race results page with podium, stats, and action buttons
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Podium } from "@/components/race";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";
import { Loader2, RotateCcw, LogOut, Trophy, Users } from "lucide-react";

export default function RaceResults() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const sessionId = useSessionId();

  // State
  const [isResetting, setIsResetting] = useState(false);
  const hasNavigatedRef = useRef(false);

  // Convex queries and mutations
  const room = useQuery(
    api.rooms.getById,
    raceId ? { roomId: raceId as Id<"rooms"> } : "skip"
  );
  const results = useQuery(
    api.raceResults.getResults,
    raceId ? { raceId: raceId as Id<"rooms"> } : "skip"
  );
  const participants = useQuery(
    api.participants.listByRoom,
    raceId ? { roomId: raceId as Id<"rooms"> } : "skip"
  );

  const resetForNewRace = useMutation(api.rooms.resetForNewRace);
  const disconnectParticipant = useMutation(api.participants.disconnect);

  // Check if current user is host
  const isHost = room?.hostId === sessionId;

  // Get current participant
  const currentParticipant = participants?.find(p => p.sessionId === sessionId);

  // Find user's position in results
  const userRanking = results?.rankings?.find(r => r.sessionId === sessionId);

  // Handle room reset - navigate back to lobby
  useEffect(() => {
    if (room?.status === "waiting" && !room.raceStartTime && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Room has been reset - go back to lobby
      navigate(`/race/lobby/${raceId}${isHost ? "?host=true" : ""}`);
    }
  }, [room?.status, room?.raceStartTime, raceId, isHost, navigate]);

  // Handle "Race Again" - only host can do this
  const handleRaceAgain = useCallback(async () => {
    if (!raceId || !isHost || isResetting) return;
    
    setIsResetting(true);
    try {
      await resetForNewRace({ roomId: raceId as Id<"rooms"> });
      // Navigation will happen via the useEffect above
    } catch (error) {
      console.error("Failed to reset race:", error);
      setIsResetting(false);
    }
  }, [raceId, isHost, isResetting, resetForNewRace]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    if (currentParticipant) {
      try {
        await disconnectParticipant({ participantId: currentParticipant._id });
      } catch (error) {
        // Silently fail - we're leaving anyway
      }
    }
    navigate("/race");
  }, [currentParticipant, disconnectParticipant, navigate]);

  // Loading state
  if (!room || !results) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: tv.bg.base }}
      >
        <div className="flex items-center gap-3" style={{ color: tv.text.secondary }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading results...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: tv.bg.base }}
    >
      {/* Header */}
      <header
        className="px-6 py-4"
        style={{
          backgroundColor: tv.bg.surface,
          borderBottom: `1px solid ${tv.border.default}`,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={24} style={{ color: tv.status.warning.DEFAULT }} />
            <h1
              className="text-2xl font-bold"
              style={{ color: tv.text.primary }}
            >
              Race Results
            </h1>
          </div>

          {/* Participant count */}
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: tv.text.secondary }}
          >
            <Users size={18} />
            <span>{results.totalRacers} racers</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Top section: Two columns - Stats on left (30%), Podium on right (70%) */}
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 mb-8">
            {/* Left column: Position + Speed stacked */}
            {userRanking && (
              <div className="flex flex-col gap-4">
                {/* Position Card */}
                <div
                  className="flex-1 p-8 rounded-xl text-center flex flex-col justify-center"
                  style={{
                    backgroundColor: tv.bg.surface,
                    border: `1px solid ${tv.border.default}`,
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: tv.text.secondary }}
                  >
                    Your Position
                  </p>
                  <p
                    className="text-6xl font-black"
                    style={{
                      color:
                        userRanking.position === 1
                          ? tv.status.warning.DEFAULT
                          : userRanking.position === 2
                          ? "#c0c0c0"
                          : userRanking.position === 3
                          ? "#cd7f32"
                          : tv.text.primary,
                    }}
                  >
                    #{userRanking.position}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: tv.text.muted }}
                  >
                    {userRanking.position === 1
                      ? "Winner!"
                      : userRanking.position === 2
                      ? "Runner Up"
                      : userRanking.position === 3
                      ? "Bronze"
                      : `of ${results.totalRacers} racers`}
                  </p>
                </div>

                {/* Speed Card */}
                <div
                  className="flex-1 p-8 rounded-xl text-center flex flex-col justify-center"
                  style={{
                    backgroundColor: tv.interactive.accent.subtle,
                    border: `2px solid ${tv.interactive.accent.DEFAULT}`,
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: tv.text.secondary }}
                  >
                    Your Speed
                  </p>
                  <p
                    className="text-6xl font-black"
                    style={{ color: tv.interactive.accent.DEFAULT }}
                  >
                    {userRanking.wpm}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: tv.text.muted }}
                  >
                    words per minute
                  </p>
                </div>
              </div>
            )}

            {/* Right column: Podium visualization only */}
            <div
              className="rounded-xl p-6 flex items-center justify-center"
              style={{
                backgroundColor: tv.bg.surface,
                border: `1px solid ${tv.border.default}`,
              }}
            >
              <Podium
                rankings={results.rankings || []}
                currentSessionId={sessionId}
                showTable={false}
              />
            </div>
          </div>

          {/* Bottom section: Full results table */}
          <Podium
            rankings={results.rankings || []}
            currentSessionId={sessionId}
            showTable={true}
            showPodium={false}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {isHost ? (
              <button
                onClick={handleRaceAgain}
                disabled={isResetting}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: tv.interactive.accent.DEFAULT,
                  color: tv.text.inverse,
                }}
              >
                {isResetting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} />
                    Race Again
                  </>
                )}
              </button>
            ) : (
              <div
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: tv.bg.elevated,
                  color: tv.text.secondary,
                }}
              >
                Waiting for host to start new race...
              </div>
            )}

            <button
              onClick={handleLeave}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all hover:opacity-90"
              style={{
                backgroundColor: tv.bg.elevated,
                color: tv.text.primary,
              }}
            >
              <LogOut size={18} />
              Leave
            </button>
          </div>

          {/* Back link */}
          <div className="text-center mt-8">
            <Link
              to="/race"
              className="text-sm transition-opacity hover:opacity-80"
              style={{ color: tv.text.secondary }}
            >
              ← Back to Race Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
