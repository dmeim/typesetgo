// src/pages/RaceActive.tsx
// Active racing screen with race course (top 4/5) and typing area (bottom 1/5)
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RaceCourse } from "@/components/race";
import TypingArea from "@/components/typing/TypingArea";
import type { TypingStats } from "@/components/typing/TypingArea";
import { useTheme } from "@/hooks/useTheme";
import { useSessionId } from "@/hooks/useSessionId";
import type { LegacyTheme } from "@/types/theme";
import { Loader2, Clock, Flag, LogOut, X } from "lucide-react";

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

const FINAL_TIMER_DURATION = 10; // seconds after top 3 finish

export default function RaceActive() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { legacyTheme } = useTheme();
  const sessionId = useSessionId();
  
  const theme: LegacyTheme = legacyTheme ?? DEFAULT_THEME;

  // State - Race starts immediately (countdown happens in lobby)
  const [raceStarted, setRaceStarted] = useState(true);
  const [finalTimer, setFinalTimer] = useState<number | null>(null);
  const [isRaceEnded, setIsRaceEnded] = useState(false);
  const [lastStats, setLastStats] = useState<TypingStats | null>(null);
  const [hasLocallyFinished, setHasLocallyFinished] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  // Refs
  const hasNavigatedRef = useRef(false);

  // Convex queries and mutations
  const room = useQuery(
    api.rooms.getById,
    raceId ? { roomId: raceId as Id<"rooms"> } : "skip"
  );
  const participants = useQuery(
    api.participants.listByRoom,
    raceId ? { roomId: raceId as Id<"rooms"> } : "skip"
  );
  const currentParticipant = useQuery(
    api.participants.getBySession,
    raceId ? { roomId: raceId as Id<"rooms">, sessionId } : "skip"
  );

  const updateProgress = useMutation(api.participants.updateProgress);
  const recordFinish = useMutation(api.participants.recordFinish);
  const endRace = useMutation(api.rooms.endRace);
  const saveResults = useMutation(api.raceResults.saveResults);
  const disconnectParticipant = useMutation(api.participants.disconnect);

  // Connected participants for display
  const connectedParticipants = participants?.filter(p => p.isConnected) || [];
  
  // Count finished racers
  const finishedCount = connectedParticipants.filter(p => p.stats?.isFinished).length;
  const totalRacers = connectedParticipants.length;

  // Local optimistic progress for current user (eliminates server round-trip lag)
  const [localProgress, setLocalProgress] = useState(0);
  const [localWpm, setLocalWpm] = useState(0);

  // Build racers data for RaceCourse
  // Use local state for current user to avoid server round-trip latency
  const racers = useMemo(() => {
    return connectedParticipants.map(p => {
      const isCurrentUser = p.sessionId === sessionId;
      return {
        sessionId: p.sessionId,
        name: p.name,
        emoji: p.emoji || "🏎️",
        // Use local state for current user for instant feedback
        progress: isCurrentUser ? localProgress : (p.stats?.progress || 0),
        wpm: isCurrentUser ? localWpm : (p.stats?.wpm || 0),
        isFinished: p.stats?.isFinished || false,
        position: p.position,
        isCurrentUser,
      };
    });
  }, [connectedParticipants, sessionId, localProgress, localWpm]);

  // Race starts immediately - countdown already happened in lobby
  useEffect(() => {
    if (room?.raceStartTime) {
      setRaceStarted(true);
    }
  }, [room?.raceStartTime]);

  // Reset local state when race/room changes
  useEffect(() => {
    setHasLocallyFinished(false);
    setLocalProgress(0);
    setLocalWpm(0);
  }, [raceId]);

  // Initialize local progress from server state (for reconnection)
  useEffect(() => {
    if (currentParticipant?.stats && localProgress === 0) {
      setLocalProgress(currentParticipant.stats.progress || 0);
      setLocalWpm(currentParticipant.stats.wpm || 0);
    }
  }, [currentParticipant?.stats]);

  // ESC key to open leave modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLeaveModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Leave the race
  const handleLeaveRace = useCallback(async () => {
    if (currentParticipant) {
      try {
        await disconnectParticipant({ participantId: currentParticipant._id });
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
    }
    navigate("/race");
  }, [currentParticipant, disconnectParticipant, navigate]);

  // Handle final timer (10 seconds after top 3 finish)
  useEffect(() => {
    if (isRaceEnded || !raceStarted) return;

    // Start 10-second timer when 3 or more have finished
    if (finishedCount >= 3 && finalTimer === null) {
      setFinalTimer(FINAL_TIMER_DURATION);
    }

    // Also end race if everyone finished
    if (finishedCount === totalRacers && totalRacers > 0) {
      handleRaceEnd();
    }
  }, [finishedCount, totalRacers, raceStarted, finalTimer, isRaceEnded]);

  // Countdown for final timer
  useEffect(() => {
    if (finalTimer === null || finalTimer <= 0) return;

    const interval = setInterval(() => {
      setFinalTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleRaceEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [finalTimer]);

  // Navigate to results when race ends
  useEffect(() => {
    if (room?.raceEndTime && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Small delay to ensure results are saved
      setTimeout(() => {
        navigate(`/race/results/${raceId}`);
      }, 500);
    }
  }, [room?.raceEndTime, raceId, navigate]);

  // Handle race end
  const handleRaceEnd = useCallback(async () => {
    if (isRaceEnded || !raceId) return;
    setIsRaceEnded(true);

    try {
      // End the race and save results
      await endRace({ roomId: raceId as Id<"rooms"> });
      await saveResults({ raceId: raceId as Id<"rooms"> });
    } catch (error) {
      console.error("Failed to end race:", error);
    }
  }, [isRaceEnded, raceId, endRace, saveResults]);

  // Handle typing progress
  const handleProgress = useCallback(async (stats: TypingStats) => {
    if (!currentParticipant || !raceStarted || isRaceEnded) return;
    
    setLastStats(stats);
    
    // Update local state immediately for instant UI feedback (optimistic update)
    setLocalProgress(stats.progress);
    setLocalWpm(stats.wpm);

    // Fire-and-forget server update (don't await - reduces perceived lag)
    updateProgress({
      participantId: currentParticipant._id,
      typedProgress: stats.correctChars,
      stats: {
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        progress: stats.progress,
        wordsTyped: Math.floor(stats.correctChars / 5),
        timeElapsed: stats.elapsedMs,
        isFinished: stats.isFinished,
      },
    }).catch(() => {
      // Silently fail - updates are best effort
    });
  }, [currentParticipant, raceStarted, isRaceEnded, updateProgress]);

  // Handle finish
  const handleFinish = useCallback(async (_stats: TypingStats) => {
    if (!currentParticipant || !room?.raceStartTime || hasLocallyFinished) return;

    // Set local finish state immediately for instant UI feedback
    setHasLocallyFinished(true);

    // Calculate finish time from race start
    const finishTime = Date.now() - room.raceStartTime;

    try {
      await recordFinish({
        participantId: currentParticipant._id,
        finishTime,
      });
    } catch (error) {
      console.error("Failed to record finish:", error);
    }
  }, [currentParticipant, room?.raceStartTime, hasLocallyFinished, recordFinish]);

  // Loading state
  if (!room || !participants) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading race...</span>
        </div>
      </div>
    );
  }

  const targetText = room.targetText || "";
  const isTypingDisabled = !raceStarted || isRaceEnded || hasLocallyFinished || currentParticipant?.stats?.isFinished;

  return (
    <div
      className="min-h-screen flex flex-col overflow-y-auto"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Race header bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          backgroundColor: theme.surfaceColor,
          borderBottom: `1px solid ${theme.borderDefault}`,
        }}
      >
        {/* Race info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Flag size={18} style={{ color: theme.accentColor }} />
            <span className="font-bold" style={{ color: theme.textPrimary }}>
              Race in Progress
            </span>
          </div>
          <span
            className="text-sm"
            style={{ color: theme.textSecondary }}
          >
            {finishedCount} / {totalRacers} finished
          </span>
        </div>

        {/* Timer / Status */}
        <div className="flex items-center gap-4">
          {/* WPM indicator */}
          {lastStats && raceStarted && (
            <div
              className="text-sm font-mono"
              style={{ color: theme.textSecondary }}
            >
              <span style={{ color: theme.accentColor }}>{lastStats.wpm}</span> WPM
            </div>
          )}

          {/* Final timer warning */}
          {finalTimer !== null && finalTimer > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg animate-pulse"
              style={{
                backgroundColor: theme.statusWarningMuted,
                color: theme.statusWarning,
              }}
            >
              <Clock size={16} />
              <span className="font-bold">{finalTimer}s remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* Race course (flexible, takes remaining space) */}
      <div
        className="flex-1 min-h-[200px]"
        style={{ 
          backgroundColor: theme.backgroundColor,
        }}
      >
        <RaceCourse
          racers={racers}
          theme={theme}
          isRaceActive={raceStarted && !isRaceEnded}
        />
      </div>

      {/* Typing area (shrink-0 with min-height for usability) */}
      <div
        className="shrink-0 p-4"
        style={{
          backgroundColor: theme.surfaceColor,
          borderTop: `2px solid ${theme.borderDefault}`,
          minHeight: "120px",
        }}
      >
        {isRaceEnded ? (
          // Race ended message
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-2xl font-bold mb-2"
                style={{ color: theme.textPrimary }}
              >
                Race Complete!
              </p>
              <p style={{ color: theme.textSecondary }}>
                Loading results...
              </p>
            </div>
          </div>
        ) : (
          // Typing area
          <div className="h-full flex flex-col">
            <TypingArea
              targetText={targetText}
              onProgress={handleProgress}
              onFinish={handleFinish}
              isActive={!isTypingDisabled}
              mode="race"
              feedingTape
              showStats={false}
              fontSize={1.75}
              autoFocus
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Finish overlay for current user */}
      {(hasLocallyFinished || currentParticipant?.stats?.isFinished) && !isRaceEnded && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: `${theme.overlayColor}` }}
        >
          <div
            className="text-center p-8 rounded-2xl pointer-events-auto"
            style={{ backgroundColor: theme.surfaceColor }}
          >
            <div className="text-6xl mb-4">🏁</div>
            <h2
              className="text-3xl font-black mb-2"
              style={{ color: theme.statusSuccess }}
            >
              You Finished!
            </h2>
            <p style={{ color: theme.textSecondary }}>
              Position: <span style={{ color: theme.accentColor }}>#{currentParticipant?.position || "..."}</span>
            </p>
            <p
              className="text-sm mt-4"
              style={{ color: theme.textMuted }}
            >
              Waiting for other racers...
            </p>
          </div>
        </div>
      )}

      {/* Leave race modal (ESC key) */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: theme.overlayColor }}
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="relative text-center p-8 rounded-2xl max-w-sm w-full mx-4"
            style={{
              backgroundColor: theme.surfaceColor,
              border: `1px solid ${theme.borderDefault}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: theme.textSecondary }}
            >
              <X size={20} />
            </button>

            <div className="text-5xl mb-4">🚪</div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: theme.textPrimary }}
            >
              Leave Race?
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: theme.textSecondary }}
            >
              You'll be removed from the race and your progress will be lost.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: theme.elevatedColor,
                  color: theme.textPrimary,
                }}
              >
                Keep Racing
              </button>
              <button
                onClick={handleLeaveRace}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: theme.statusErrorMuted,
                  color: theme.statusError,
                  border: `1px solid ${theme.statusError}`,
                }}
              >
                <LogOut size={16} />
                Leave Race
              </button>
            </div>

            <p
              className="text-xs mt-4"
              style={{ color: theme.textMuted }}
            >
              Press ESC to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
