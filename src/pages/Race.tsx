// src/pages/Race.tsx
// Race landing page with Host and Join cards
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import { useSessionId } from "@/hooks/useSessionId";
import type { LegacyTheme } from "@/types/theme";
import { Flag, LogIn } from "lucide-react";

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

// Host Card Component
function RaceHostCard({ theme }: { theme: LegacyTheme }) {
  const { user: clerkUser, isSignedIn } = useUser();
  const [hostName, setHostName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const sessionId = useSessionId();
  
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.participants.join);
  
  // Use clerk username if signed in
  const displayName = isSignedIn && clerkUser?.username 
    ? clerkUser.username 
    : hostName;
  const canHost = isSignedIn || hostName.trim().length > 0;

  const handleHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canHost || isLoading) return;
    
    const name = displayName.trim();
    if (!name) return;
    
    setIsLoading(true);
    try {
      // Create the room with race mode
      const { roomId, code } = await createRoom({
        hostName: name,
        hostSessionId: sessionId,
        gameMode: "race",
      });
      
      // Join as participant
      await joinRoom({
        roomCode: code,
        sessionId,
        name,
      });
      
      // Navigate to lobby as host
      navigate(`/race/lobby/${roomId}?host=true`);
    } catch (error) {
      console.error("Failed to create race room:", error);
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-10 flex flex-col items-center group transition-all duration-300 h-96 ${
        isFocused ? "justify-start pt-10" : "justify-center"
      }`}
      style={{ 
        backgroundColor: theme.surfaceColor,
        border: `1px solid ${theme.borderDefault}`,
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-6"
        style={{ color: theme.textSecondary }}
      >
        Create Race
      </div>
      <h2
        className="text-5xl font-black mb-8"
        style={{ color: theme.accentColor }}
      >
        HOST
      </h2>

      <form
        onSubmit={handleHost}
        className="w-full max-w-xs flex flex-col gap-4 z-10"
      >
        {isSignedIn ? (
          <div 
            className="text-center py-3 rounded font-medium"
            style={{ color: theme.textPrimary }}
          >
            Hosting as <span style={{ color: theme.accentColor }}>{displayName}</span>
          </div>
        ) : (
          <input
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full px-4 py-3 rounded text-center text-lg font-bold tracking-wide focus:outline-none placeholder-gray-600"
            style={{ 
              backgroundColor: theme.elevatedColor,
              color: theme.textPrimary,
              borderColor: isFocused ? theme.accentColor : "transparent",
              border: "1px solid",
            }}
            maxLength={15}
            onFocus={() => {
              if (window.innerWidth < 768) setIsFocused(true);
            }}
            onBlur={() => setIsFocused(false)}
          />
        )}
        <button
          type="submit"
          disabled={!canHost || isLoading}
          className="w-full px-8 py-3 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{
            backgroundColor: theme.accentColor,
            color: theme.textInverse,
            boxShadow: `0 10px 15px -3px ${theme.accentMuted}`,
          }}
        >
          {isLoading ? "Creating..." : "Start Race"}
        </button>
      </form>

      {/* Background decoration */}
      <div 
        className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ color: theme.textPrimary }}
      >
        <Flag size={150} strokeWidth={1} />
      </div>
    </div>
  );
}

// Join Card Component
function RaceJoinCard({ theme }: { theme: LegacyTheme }) {
  const { user: clerkUser, isSignedIn } = useUser();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [joinName, setJoinName] = useState(searchParams.get("name") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const sessionId = useSessionId();
  
  const joinRoom = useMutation(api.participants.join);
  
  // Use clerk username if signed in
  const displayName = isSignedIn && clerkUser?.username 
    ? clerkUser.username 
    : joinName;
  const canJoin = code.trim().length > 0 && (isSignedIn || joinName.trim().length > 0);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin || isLoading) return;
    
    const name = displayName.trim();
    const roomCode = code.trim().toUpperCase();
    if (!name || !roomCode) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const result = await joinRoom({
        roomCode,
        sessionId,
        name,
      });
      
      if (!result?.room) {
        setError("Room not found");
        setIsLoading(false);
        return;
      }
      
      // Check if it's a race room
      if (result.room.gameMode !== "race") {
        setError("This is not a race room");
        setIsLoading(false);
        return;
      }
      
      // Navigate to lobby
      navigate(`/race/lobby/${result.room._id}`);
    } catch (err) {
      console.error("Failed to join race:", err);
      setError("Failed to join race");
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-10 flex flex-col items-center group transition-all duration-300 h-96 ${
        isFocused ? "justify-start pt-10" : "justify-center"
      }`}
      style={{ 
        backgroundColor: theme.surfaceColor,
        border: `1px solid ${theme.borderDefault}`,
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-6"
        style={{ color: theme.textSecondary }}
      >
        Join Race
      </div>
      <h2
        className="text-5xl font-black mb-8"
        style={{ color: theme.buttonSelected }}
      >
        JOIN
      </h2>

      <form
        onSubmit={handleJoin}
        className="w-full max-w-xs flex flex-col gap-4 z-10"
      >
        {isSignedIn ? (
          <div 
            className="text-center py-3 rounded font-medium"
            style={{ color: theme.textPrimary }}
          >
            Joining as <span style={{ color: theme.accentColor }}>{displayName}</span>
          </div>
        ) : (
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full px-4 py-3 rounded text-center text-lg font-bold tracking-wide focus:outline-none placeholder-gray-600"
            style={{ 
              backgroundColor: theme.elevatedColor,
              color: theme.textPrimary,
              borderColor: isFocused ? theme.accentColor : "transparent",
              border: "1px solid",
            }}
            onFocus={() => {
              if (window.innerWidth < 768) setIsFocused(true);
            }}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            maxLength={15}
          />
        )}
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="ENTER CODE"
          className="w-full px-4 py-3 rounded text-center text-xl font-bold tracking-widest uppercase focus:outline-none placeholder-gray-600"
          style={{ 
            backgroundColor: theme.elevatedColor,
            color: theme.textPrimary,
            borderColor: error ? theme.statusError : (isFocused ? theme.accentColor : "transparent"),
            border: "1px solid",
          }}
          onFocus={() => {
            if (window.innerWidth < 768) setIsFocused(true);
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          maxLength={6}
        />
        {error && (
          <p className="text-sm text-center" style={{ color: theme.statusError }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!canJoin || isLoading}
          className="w-full px-8 py-3 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: theme.elevatedColor,
            color: theme.textPrimary,
          }}
        >
          {isLoading ? "Joining..." : "Join Race"}
        </button>
      </form>

      {/* Background decoration */}
      <div 
        className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ color: theme.textPrimary }}
      >
        <LogIn size={150} strokeWidth={1} />
      </div>
    </div>
  );
}

export default function Race() {
  const { legacyTheme } = useTheme();
  const theme: LegacyTheme = legacyTheme ?? DEFAULT_THEME;

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <Header />

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: theme.accentColor }}
            >
              Race Mode
            </h1>
            <p style={{ color: theme.textSecondary }}>
              Challenge your friends to real-time typing races
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RaceHostCard theme={theme} />
            <RaceJoinCard theme={theme} />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/"
              className="transition text-sm hover:opacity-80"
              style={{ color: theme.textSecondary }}
            >
              ← Back to Typing
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 p-6 flex justify-center gap-8">
        <Link
          to="/about"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          About
        </Link>
        <Link
          to="/privacy"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          Privacy
        </Link>
        <Link
          to="/tos"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}
