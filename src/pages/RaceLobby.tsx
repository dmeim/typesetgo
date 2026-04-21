// src/pages/RaceLobby.tsx
// Race lobby page with game options, player cards, ready system, and countdown
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Header from "@/components/layout/Header";
import { PlayerCard } from "@/components/race";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";
import { Copy, Check, Settings, Users, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const sessionId = useSessionId();
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

  // Host triggers startRace immediately when all players are ready
  const hasStartedRaceRef = useRef(false);
  useEffect(() => {
    if (allReady && connectedParticipants.length >= 1 && isHost && !hasStartedRaceRef.current && lobbyId) {
      hasStartedRaceRef.current = true;
      startRace({ roomId: lobbyId as Id<"rooms"> }).catch((err) => {
        console.error("Failed to start race:", err);
        hasStartedRaceRef.current = false;
      });
    }
    // Reset if players become unready
    if (!allReady) {
      hasStartedRaceRef.current = false;
    }
  }, [allReady, connectedParticipants.length, isHost, lobbyId, startRace]);

  // All clients derive countdown from server raceStartTime
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (room?.raceStartTime && room.status === "active") {
      // Compute initial countdown
      const computeCountdown = () => {
        const secondsLeft = Math.ceil((room.raceStartTime! - Date.now()) / 1000);
        return Math.max(0, secondsLeft);
      };

      const initial = computeCountdown();
      setCountdown(initial > 0 ? initial : null);

      if (initial > 0) {
        countdownIntervalRef.current = window.setInterval(() => {
          const remaining = computeCountdown();
          if (remaining <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(null);
            // Navigate to race
            if (!hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              navigate(`/race/${lobbyId}`);
            }
          } else {
            setCountdown(remaining);
          }
        }, 200);
      } else {
        // raceStartTime already passed, navigate immediately
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(`/race/${lobbyId}`);
        }
      }
    } else {
      setCountdown(null);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [room?.raceStartTime, room?.status, lobbyId, navigate]);

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
        style={{ backgroundColor: tv.bg.base }}
      >
        <div className="flex items-center gap-3" style={{ color: tv.text.secondary }}>
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
        style={{ backgroundColor: tv.bg.base }}
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: tv.text.primary }}
          >
            Room Not Found
          </h1>
          <Link
            to="/race"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: tv.interactive.accent.DEFAULT, color: tv.text.inverse }}
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
      style={{ backgroundColor: tv.bg.base }}
    >
      <Header />

      <main className="pt-24 pb-8 px-4 max-w-6xl mx-auto">
        {/* Header with room code */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/race"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: tv.text.secondary }}
          >
            <ArrowLeft size={18} />
            Leave Race
          </Link>

          {/* Room code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{
              backgroundColor: tv.bg.surface,
              border: `1px solid ${tv.border.default}`,
            }}
          >
            <span style={{ color: tv.text.secondary }}>Room Code:</span>
            <span
              className="font-mono font-bold text-xl tracking-widest"
              style={{ color: tv.interactive.accent.DEFAULT }}
            >
              {room.code}
            </span>
            {copied ? (
              <Check size={18} style={{ color: tv.status.success.DEFAULT }} />
            ) : (
              <Copy size={18} style={{ color: tv.text.secondary }} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Host Settings Card (left column on desktop) */}
          {isHost && (
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: tv.bg.surface,
                border: `1px solid ${tv.border.default}`,
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Settings size={20} style={{ color: tv.interactive.accent.DEFAULT }} />
                <h2
                  className="font-bold text-lg"
                  style={{ color: tv.text.primary }}
                >
                  Race Settings
                </h2>
              </div>

              {/* Difficulty selector */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: tv.text.secondary }}
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
                            ? tv.interactive.accent.DEFAULT
                            : tv.bg.elevated,
                        color:
                          room.settings.difficulty === value
                            ? tv.text.inverse
                            : tv.text.primary,
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
                  style={{ color: tv.text.secondary }}
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
                            ? tv.interactive.accent.DEFAULT
                            : tv.bg.elevated,
                        color:
                          room.settings.wordTarget === count
                            ? tv.text.inverse
                            : tv.text.primary,
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
              backgroundColor: tv.bg.surface,
              border: `1px solid ${tv.border.default}`,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users size={20} style={{ color: tv.interactive.accent.DEFAULT }} />
                <h2
                  className="font-bold text-lg"
                  style={{ color: tv.text.primary }}
                >
                  Racers
                </h2>
                <span
                  className="text-sm"
                  style={{ color: tv.text.secondary }}
                >
                  ({connectedParticipants.length})
                </span>
              </div>

              {/* Ready status */}
              <div
                className="text-sm"
                style={{ color: tv.text.secondary }}
              >
                {connectedParticipants.filter(p => p.isReady).length} / {connectedParticipants.length} ready
              </div>
            </div>

            {/* Player grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {connectedParticipants.map((participant) => {
                  const isCurrentUser = participant.sessionId === sessionId;
                  const participantIsHost = participant.sessionId === room.hostId;

                  return (
                    <motion.div
                      key={participant._id}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    >
                      <PlayerCard
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
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {connectedParticipants.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: tv.text.secondary }}
              >
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Waiting for racers to join...</p>
                <p className="text-sm mt-2">
                  Share the room code: <strong style={{ color: tv.interactive.accent.DEFAULT }}>{room.code}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown !== null && countdown > 0 && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: tv.bg.overlay }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="text-center p-12 rounded-2xl"
                style={{ backgroundColor: tv.bg.surface }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <p
                  className="text-lg font-medium mb-4"
                  style={{ color: tv.text.secondary }}
                >
                  Race starting in...
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={countdown}
                    className="text-8xl font-black mb-6"
                    style={{ color: tv.interactive.accent.DEFAULT }}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    {countdown}
                  </motion.div>
                </AnimatePresence>
                <p
                  className="text-sm mb-6 max-w-xs mx-auto"
                  style={{ color: tv.text.muted }}
                >
                  All characters must be typed correctly in order to progress in the race.
                </p>
                {/* Cancel ready button - visible during countdown */}
                {currentParticipant?.isReady && (
                  <button
                    onClick={handleReadyToggle}
                    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: tv.status.error.muted,
                      color: tv.status.error.DEFAULT,
                      border: `1px solid ${tv.status.error.DEFAULT}`,
                    }}
                  >
                    Cancel Ready
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
