// src/pages/Join.tsx
import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { GLOBAL_COLORS } from "@/lib/colors";
import { useSessionId } from "@/hooks/useSessionId";
import { JoinCard } from "@/components/connect";
import TypingPractice from "@/components/typing/TypingPractice";
import type { SettingsState } from "@/lib/typing-constants";

// Custom hook to generate a session key that increments when status becomes active
function useSessionKeyForStatus(status: string | undefined) {
  const [sessionKey, setSessionKey] = useState(0);
  const [prevStatus, setPrevStatus] = useState<string | undefined>(undefined);

  // Use effect to track status changes
  useEffect(() => {
    if (status === "active" && prevStatus === "waiting") {
      setSessionKey((prev) => prev + 1);
    }
    setPrevStatus(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return sessionKey;
}

function JoinRoomContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const searchName = searchParams.get("name");

  const [name, setName] = useState<string | null>(searchName);
  const [inputName, setInputName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const sessionId = useSessionId();

  // Convex mutations
  const joinRoom = useMutation(api.participants.join);
  // TODO: Local-first optimization — updateStats fires on every typing progress event.
  // Batch locally and flush every 500ms–1s instead of per-keystroke writes.
  const updateStats = useMutation(api.participants.updateStats);

  // Convex queries
  const room = useQuery(
    api.rooms.getByCode,
    code ? { code: code.toUpperCase() } : "skip"
  );

  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Track test status changes to reset session
  const sessionKey = useSessionKeyForStatus(room?.status);

  // Join room when name and code are present
  useEffect(() => {
    if (!sessionId || !code || !name || isJoining || participantId) return;

    const doJoin = async () => {
      setIsJoining(true);
      try {
        const result = await joinRoom({
          roomCode: code.toUpperCase(),
          sessionId,
          name,
        });
        setParticipantId(result.participantId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join room");
      }
      setIsJoining(false);
    };

    doJoin();
  }, [sessionId, code, name, joinRoom, isJoining, participantId]);

  // Find current participant
  const currentParticipant = participants?.find((p) => p._id === participantId);

  // Check if kicked
  const wasKicked = participantId && participants && !currentParticipant;

  // Handle stats update for TypingPractice
  const handleStatsUpdate = useCallback(
    (
      stats: {
        wpm: number;
        accuracy: number;
        progress: number;
        wordsTyped: number;
        timeElapsed: number;
        isFinished: boolean;
      },
      typedText?: string,
      targetText?: string
    ) => {
      if (participantId) {
        updateStats({
          participantId: participantId as Id<"participants">,
          stats,
          typedText,
          targetText,
        });
      }
    },
    [participantId, updateStats]
  );

  const handleLeave = () => {
    navigate("/connect");
  };

  // Convert room settings to SettingsState format
  const lockedSettings: Partial<SettingsState> | undefined = room?.settings
    ? {
        mode: room.settings.mode as SettingsState["mode"],
        duration: room.settings.duration,
        wordTarget: room.settings.wordTarget,
        difficulty: room.settings.difficulty as SettingsState["difficulty"],
        punctuation: room.settings.punctuation,
        numbers: room.settings.numbers,
        capitalization: room.settings.capitalization,
        quoteLength: room.settings.quoteLength as SettingsState["quoteLength"],
        presetText: room.settings.presetText,
        presetModeType:
          room.settings.presetModeType as SettingsState["presetModeType"],
        ghostWriterEnabled: room.settings.ghostWriterEnabled,
        ghostWriterSpeed: room.settings.ghostWriterSpeed,
        soundEnabled: room.settings.soundEnabled,
        typingFontSize: room.settings.typingFontSize,
        textAlign: room.settings.textAlign as SettingsState["textAlign"],
        theme: room.settings.theme,
        plan: room.settings.plan,
        planIndex: room.settings.planIndex,
      }
    : undefined;

  // If no code is provided, show the default Join Card
  if (!code) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center font-mono px-4 transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <Link
              to="/connect"
              className="text-sm hover:text-white mb-4 inline-block"
              style={{ color: GLOBAL_COLORS.text.secondary }}
            >
              ← Back
            </Link>
          </div>
          <JoinCard />
        </div>
      </div>
    );
  }

  if (error || wasKicked) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        <div className="text-xl" style={{ color: GLOBAL_COLORS.text.error }}>
          {error || "You have been removed from the room"}
        </div>
        <button
          onClick={() => navigate("/connect")}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  // If code is present but no name, show the name entry form
  if (!name) {
    return (
      <div
        className={`min-h-[100dvh] flex items-center justify-center px-4 transition-all duration-300 ${isFocused && typeof window !== "undefined" && window.innerWidth < 768 ? "items-start pt-20" : ""}`}
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        <div
          className="w-full max-w-md p-8 rounded-2xl border border-gray-800 shadow-2xl text-center animate-fade-in"
          style={{ backgroundColor: GLOBAL_COLORS.surface }}
        >
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: GLOBAL_COLORS.brand.primary }}
          >
            Join Room
          </h2>
          <div className="mb-8" style={{ color: GLOBAL_COLORS.text.secondary }}>
            Joining Room:{" "}
            <span className="font-mono font-bold text-white">{code}</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputName.trim()) {
                setName(inputName.trim());
              }
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="YOUR NAME"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-lg font-bold tracking-wide focus:outline-none text-white placeholder-gray-600"
              style={{ borderColor: "transparent" }}
              onFocus={(e) => {
                e.target.style.borderColor = GLOBAL_COLORS.brand.primary;
                if (window.innerWidth < 768) setIsFocused(true);
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "transparent";
                setIsFocused(false);
              }}
              maxLength={15}
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputName.trim()}
              className="w-full px-8 py-3 text-gray-900 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{
                backgroundColor: GLOBAL_COLORS.brand.primary,
                boxShadow: `0 10px 15px -3px ${GLOBAL_COLORS.brand.primary}33`,
              }}
            >
              Enter Room
            </button>
          </form>
          <div className="mt-6">
            <button
              onClick={() => navigate("/connect")}
              className="text-sm transition hover:text-white"
              style={{ color: GLOBAL_COLORS.text.secondary }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!participantId || !lockedSettings || !room) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        Connecting to room {code}...
      </div>
    );
  }

  // Show TypingPractice in connect mode
  return (
    <TypingPractice
      key={sessionKey}
      connectMode={true}
      lockedSettings={lockedSettings}
      isTestActive={room.status === "active"}
      onStatsUpdate={handleStatsUpdate}
      onLeave={handleLeave}
    />
  );
}

export default function Join() {
  return <JoinRoomContent />;
}
