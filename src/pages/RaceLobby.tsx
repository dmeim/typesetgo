// src/pages/RaceLobby.tsx
// Race lobby page with game options, player cards, ready system, and countdown
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Header from "@/components/layout/Header";
import { PlayerCard } from "@/components/race";
import { useTheme } from "@/hooks/useTheme";
import { useSessionId } from "@/hooks/useSessionId";
import type { LegacyTheme } from "@/types/theme";
import { Copy, Check, Settings, Users, ArrowLeft, Loader2 } from "lucide-react";

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

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

const WORD_COUNTS = [10, 15, 25, 50, 100];

export default function RaceLobby() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { legacyTheme } = useTheme();
  const sessionId = useSessionId();
  
  const theme: LegacyTheme = legacyTheme ?? DEFAULT_THEME;
  const isHost = searchParams.get("host") === "true";

  // State
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);

  // Convex queries and mutations
  const room = useQuery(
    api.rooms.getById,
    lobbyId ? { roomId: lobbyId as Id<"rooms"> } : "skip"
  );
  const participants = useQuery(
    api.participants.listByRoom,
    lobbyId ? { roomId: lobbyId as Id<"rooms"> } : "skip"
  );
  const currentParticipant = useQuery(
    api.participants.getBySession,
    lobbyId ? { roomId: lobbyId as Id<"rooms">, sessionId } : "skip"
  );

  const updateSettings = useMutation(api.rooms.updateSettings);
  const setReady = useMutation(api.participants.setReady);
  const setNotReady = useMutation(api.participants.setNotReady);
  const setEmoji = useMutation(api.participants.setEmoji);
  const setName = useMutation(api.participants.setName);
  const startRace = useMutation(api.rooms.startRace);

  // Connected participants only
  const connectedParticipants = participants?.filter(p => p.isConnected) || [];
  const allReady = connectedParticipants.length > 0 && 
    connectedParticipants.every(p => p.isReady);

  // Check if race has started and navigate
  useEffect(() => {
    if (room?.status === "active" && room.raceStartTime && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate(`/race/${lobbyId}`);
    }
  }, [room?.status, room?.raceStartTime, lobbyId, navigate]);

  // Handle countdown when all ready
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (allReady && connectedParticipants.length >= 1 && isHost) {
      // Start countdown
      setCountdown(5);
      
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Countdown finished - start race
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            // Trigger race start
            if (lobbyId) {
              startRace({ roomId: lobbyId as Id<"rooms"> }).catch(console.error);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [allReady, connectedParticipants.length, isHost, lobbyId, startRace]);

  // Copy room code to clipboard
  const handleCopyCode = useCallback(() => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [room?.code]);

  // Toggle ready status
  const handleReadyToggle = useCallback(async () => {
    if (!currentParticipant) return;
    
    try {
      if (currentParticipant.isReady) {
        await setNotReady({ participantId: currentParticipant._id });
      } else {
        await setReady({ participantId: currentParticipant._id });
      }
    } catch (error) {
      console.error("Failed to toggle ready:", error);
    }
  }, [currentParticipant, setReady, setNotReady]);

  // Update emoji
  const handleEmojiChange = useCallback(async (emoji: string) => {
    if (!currentParticipant) return;
    try {
      await setEmoji({ participantId: currentParticipant._id, emoji });
    } catch (error) {
      console.error("Failed to set emoji:", error);
    }
  }, [currentParticipant, setEmoji]);

  // Update name
  const handleNameChange = useCallback(async (name: string) => {
    if (!currentParticipant) return;
    try {
      await setName({ participantId: currentParticipant._id, name });
    } catch (error) {
      console.error("Failed to set name:", error);
    }
  }, [currentParticipant, setName]);

  // Update difficulty
  const handleDifficultyChange = useCallback(async (difficulty: string) => {
    if (!lobbyId || !isHost) return;
    try {
      await updateSettings({ 
        roomId: lobbyId as Id<"rooms">, 
        settings: { difficulty } 
      });
    } catch (error) {
      console.error("Failed to update difficulty:", error);
    }
  }, [lobbyId, isHost, updateSettings]);

  // Update word count
  const handleWordCountChange = useCallback(async (wordTarget: number) => {
    if (!lobbyId || !isHost) return;
    try {
      await updateSettings({ 
        roomId: lobbyId as Id<"rooms">, 
        settings: { wordTarget } 
      });
    } catch (error) {
      console.error("Failed to update word count:", error);
    }
  }, [lobbyId, isHost, updateSettings]);

  // Loading state
  if (!room || !participants) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading lobby...</span>
        </div>
      </div>
    );
  }

  // Room not found
  if (!room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="text-center">
          <h1 
            className="text-2xl font-bold mb-4"
            style={{ color: theme.textPrimary }}
          >
            Room Not Found
          </h1>
          <Link
            to="/race"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: theme.accentColor, color: theme.textInverse }}
          >
            <ArrowLeft size={18} />
            Back to Race
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <Header />

      <main className="pt-24 pb-8 px-4 max-w-5xl mx-auto">
        {/* Header with room code */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/race"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: theme.textSecondary }}
          >
            <ArrowLeft size={18} />
            Leave Race
          </Link>

          {/* Room code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{
              backgroundColor: theme.surfaceColor,
              border: `1px solid ${theme.borderDefault}`,
            }}
          >
            <span style={{ color: theme.textSecondary }}>Room Code:</span>
            <span
              className="font-mono font-bold text-xl tracking-widest"
              style={{ color: theme.accentColor }}
            >
              {room.code}
            </span>
            {copied ? (
              <Check size={18} style={{ color: theme.statusSuccess }} />
            ) : (
              <Copy size={18} style={{ color: theme.textSecondary }} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Host Settings Card (left column on desktop) */}
          {isHost && (
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: theme.surfaceColor,
                border: `1px solid ${theme.borderDefault}`,
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Settings size={20} style={{ color: theme.accentColor }} />
                <h2
                  className="font-bold text-lg"
                  style={{ color: theme.textPrimary }}
                >
                  Race Settings
                </h2>
              </div>

              {/* Difficulty selector */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textSecondary }}
                >
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleDifficultyChange(value)}
                      disabled={countdown !== null}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor:
                          room.settings.difficulty === value
                            ? theme.accentColor
                            : theme.elevatedColor,
                        color:
                          room.settings.difficulty === value
                            ? theme.textInverse
                            : theme.textPrimary,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word count selector */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.textSecondary }}
                >
                  Word Count
                </label>
                <div className="flex flex-wrap gap-2">
                  {WORD_COUNTS.map((count) => (
                    <button
                      key={count}
                      onClick={() => handleWordCountChange(count)}
                      disabled={countdown !== null}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor:
                          room.settings.wordTarget === count
                            ? theme.accentColor
                            : theme.elevatedColor,
                        color:
                          room.settings.wordTarget === count
                            ? theme.textInverse
                            : theme.textPrimary,
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Players Card (spans remaining columns) */}
          <div
            className={`rounded-xl p-6 ${isHost ? "lg:col-span-2" : "lg:col-span-3"}`}
            style={{
              backgroundColor: theme.surfaceColor,
              border: `1px solid ${theme.borderDefault}`,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users size={20} style={{ color: theme.accentColor }} />
                <h2
                  className="font-bold text-lg"
                  style={{ color: theme.textPrimary }}
                >
                  Racers
                </h2>
                <span
                  className="text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  ({connectedParticipants.length})
                </span>
              </div>

              {/* Ready status */}
              <div
                className="text-sm"
                style={{ color: theme.textSecondary }}
              >
                {connectedParticipants.filter(p => p.isReady).length} / {connectedParticipants.length} ready
              </div>
            </div>

            {/* Player grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {connectedParticipants.map((participant) => {
                const isCurrentUser = participant.sessionId === sessionId;
                const participantIsHost = participant.sessionId === room.hostId;

                return (
                  <PlayerCard
                    key={participant._id}
                    name={participant.name}
                    emoji={participant.emoji || "🏎️"}
                    isReady={participant.isReady || false}
                    isHost={participantIsHost}
                    isCurrentUser={isCurrentUser}
                    isCountingDown={countdown !== null}
                    countdownValue={countdown || undefined}
                    onReadyToggle={isCurrentUser ? handleReadyToggle : undefined}
                    onEmojiChange={isCurrentUser ? handleEmojiChange : undefined}
                    onNameChange={isCurrentUser ? handleNameChange : undefined}
                    theme={theme}
                  />
                );
              })}
            </div>

            {/* Empty state */}
            {connectedParticipants.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: theme.textSecondary }}
              >
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Waiting for racers to join...</p>
                <p className="text-sm mt-2">
                  Share the room code: <strong style={{ color: theme.accentColor }}>{room.code}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Countdown overlay */}
        {countdown !== null && countdown > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: theme.overlayColor }}
          >
            <div
              className="text-center p-12 rounded-2xl"
              style={{ backgroundColor: theme.surfaceColor }}
            >
              <p
                className="text-lg font-medium mb-4"
                style={{ color: theme.textSecondary }}
              >
                Race starting in...
              </p>
              <div
                className="text-8xl font-black animate-pulse mb-6"
                style={{ color: theme.accentColor }}
              >
                {countdown}
              </div>
              {/* Cancel ready button - visible during countdown */}
              {currentParticipant?.isReady && (
                <button
                  onClick={handleReadyToggle}
                  className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                  style={{
                    backgroundColor: theme.statusErrorMuted,
                    color: theme.statusError,
                    border: `1px solid ${theme.statusError}`,
                  }}
                >
                  Cancel Ready
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
