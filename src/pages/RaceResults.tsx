// src/pages/RaceResults.tsx
// Race results page with podium, stats, and action buttons
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Podium } from "@/components/race";
import { useTheme } from "@/hooks/useTheme";
import { useSessionId } from "@/hooks/useSessionId";
import type { LegacyTheme } from "@/types/theme";
import { Loader2, RotateCcw, LogOut, Trophy, Users } from "lucide-react";

// Default theme fallback
const DEFAULT_THEME: LegacyTheme = {
  cursor: "#3cb5ee",
  defaultText: "#4b5563",
  upcomingText: "#4b5563",
  correctText: "#d1d5db",
  incorrectText: "#ef4444",
  ghostCursor: "#a855f7",
  buttonUnselected: "#3cb5ee",
  buttonSelected: "#0097b2",
  accentColor: "#a855f7",
  accentMuted: "rgba(168, 85, 247, 0.3)",
  accentSubtle: "rgba(168, 85, 247, 0.1)",
  backgroundColor: "#323437",
  surfaceColor: "#2c2e31",
  elevatedColor: "#37383b",
  overlayColor: "rgba(0, 0, 0, 0.5)",
  textPrimary: "#d1d5db",
  textSecondary: "#4b5563",
  textMuted: "rgba(75, 85, 99, 0.6)",
  textInverse: "#ffffff",
  borderDefault: "rgba(75, 85, 99, 0.3)",
  borderSubtle: "rgba(75, 85, 99, 0.15)",
  borderFocus: "#3cb5ee",
  statusSuccess: "#22c55e",
  statusSuccessMuted: "rgba(34, 197, 94, 0.3)",
  statusError: "#ef4444",
  statusErrorMuted: "rgba(239, 68, 68, 0.3)",
  statusWarning: "#f59e0b",
  statusWarningMuted: "rgba(245, 158, 11, 0.3)",
};

export default function RaceResults() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { legacyTheme } = useTheme();
  const sessionId = useSessionId();
  
  const theme: LegacyTheme = legacyTheme ?? DEFAULT_THEME;

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
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading results...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header */}
      <header
        className="px-6 py-4"
        style={{
          backgroundColor: theme.surfaceColor,
          borderBottom: `1px solid ${theme.borderDefault}`,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={24} style={{ color: theme.statusWarning }} />
            <h1
              className="text-2xl font-bold"
              style={{ color: theme.textPrimary }}
            >
              Race Results
            </h1>
          </div>

          {/* Participant count */}
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: theme.textSecondary }}
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
                    backgroundColor: theme.surfaceColor,
                    border: `1px solid ${theme.borderDefault}`,
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: theme.textSecondary }}
                  >
                    Your Position
                  </p>
                  <p
                    className="text-6xl font-black"
                    style={{
                      color:
                        userRanking.position === 1
                          ? theme.statusWarning
                          : userRanking.position === 2
                          ? "#c0c0c0"
                          : userRanking.position === 3
                          ? "#cd7f32"
                          : theme.textPrimary,
                    }}
                  >
                    #{userRanking.position}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: theme.textMuted }}
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
                    backgroundColor: theme.accentSubtle,
                    border: `2px solid ${theme.accentColor}`,
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: theme.textSecondary }}
                  >
                    Your Speed
                  </p>
                  <p
                    className="text-6xl font-black"
                    style={{ color: theme.accentColor }}
                  >
                    {userRanking.wpm}
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: theme.textMuted }}
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
                backgroundColor: theme.surfaceColor,
                border: `1px solid ${theme.borderDefault}`,
              }}
            >
              <Podium
                rankings={results.rankings || []}
                currentSessionId={sessionId}
                theme={theme}
                showTable={false}
              />
            </div>
          </div>

          {/* Bottom section: Full results table */}
          <Podium
            rankings={results.rankings || []}
            currentSessionId={sessionId}
            theme={theme}
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
                  backgroundColor: theme.accentColor,
                  color: theme.textInverse,
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
                  backgroundColor: theme.elevatedColor,
                  color: theme.textSecondary,
                }}
              >
                Waiting for host to start new race...
              </div>
            )}

            <button
              onClick={handleLeave}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all hover:opacity-90"
              style={{
                backgroundColor: theme.elevatedColor,
                color: theme.textPrimary,
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
              style={{ color: theme.textSecondary }}
            >
              ← Back to Race Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
