// src/pages/Race.tsx
// Race landing page with Host and Join cards
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { useSessionId } from "@/hooks/useSessionId";
import { Flag, LogIn } from "lucide-react";

// Host Card Component
function RaceHostCard() {
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
      className={`relative rounded-2xl p-10 flex flex-col items-center group transition-all duration-300 min-h-96 ${
        isFocused ? "justify-start pt-10" : "justify-center"
      }`}
      style={{
        backgroundColor: tv.bg.surface,
        border: `1px solid ${tv.border.default}`,
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-6"
        style={{ color: tv.text.secondary }}
      >
        Create Race
      </div>
      <h2
        className="text-5xl font-black mb-8"
        style={{ color: tv.interactive.accent.DEFAULT }}
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
            style={{ color: tv.text.primary }}
          >
            Hosting as <span style={{ color: tv.interactive.accent.DEFAULT }}>{displayName}</span>
          </div>
        ) : (
          <input
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full px-4 py-3 rounded text-center text-lg font-bold tracking-wide focus:outline-none placeholder-gray-600"
            style={{
              backgroundColor: tv.bg.elevated,
              color: tv.text.primary,
              borderColor: isFocused ? tv.interactive.accent.DEFAULT : "transparent",
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
            backgroundColor: tv.interactive.accent.DEFAULT,
            color: tv.text.inverse,
            boxShadow: `0 10px 15px -3px ${tv.interactive.accent.muted}`,
          }}
        >
          {isLoading ? "Creating..." : "Start Race"}
        </button>
      </form>

      {/* Background decoration */}
      <div
        className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ color: tv.text.primary }}
      >
        <Flag size={150} strokeWidth={1} />
      </div>
    </div>
  );
}

// Join Card Component
function RaceJoinCard() {
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
      className={`relative rounded-2xl p-10 flex flex-col items-center group transition-all duration-300 min-h-96 ${
        isFocused ? "justify-start pt-10" : "justify-center"
      }`}
      style={{
        backgroundColor: tv.bg.surface,
        border: `1px solid ${tv.border.default}`,
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-6"
        style={{ color: tv.text.secondary }}
      >
        Join Race
      </div>
      <h2
        className="text-5xl font-black mb-8"
        style={{ color: tv.interactive.secondary.DEFAULT }}
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
            style={{ color: tv.text.primary }}
          >
            Joining as <span style={{ color: tv.interactive.accent.DEFAULT }}>{displayName}</span>
          </div>
        ) : (
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full px-4 py-3 rounded text-center text-lg font-bold tracking-wide focus:outline-none placeholder-gray-600"
            style={{
              backgroundColor: tv.bg.elevated,
              color: tv.text.primary,
              borderColor: isFocused ? tv.interactive.accent.DEFAULT : "transparent",
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
            backgroundColor: tv.bg.elevated,
            color: tv.text.primary,
            borderColor: error ? tv.status.error.DEFAULT : (isFocused ? tv.interactive.accent.DEFAULT : "transparent"),
            border: "1px solid",
          }}
          onFocus={() => {
            if (window.innerWidth < 768) setIsFocused(true);
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          maxLength={6}
        />
        {error && (
          <p className="text-sm text-center" style={{ color: tv.status.error.DEFAULT }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!canJoin || isLoading}
          className="w-full px-8 py-3 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: tv.bg.elevated,
            color: tv.text.primary,
          }}
        >
          {isLoading ? "Joining..." : "Join Race"}
        </button>
      </form>

      {/* Background decoration */}
      <div
        className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ color: tv.text.primary }}
      >
        <LogIn size={150} strokeWidth={1} />
      </div>
    </div>
  );
}

export default function Race() {
  useTheme();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tv.bg.base }}
    >
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: tv.interactive.accent.DEFAULT }}
            >
              Race Mode
            </h1>
            <p style={{ color: tv.text.secondary }}>
              Challenge your friends to real-time typing races
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RaceHostCard />
            <RaceJoinCard />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/"
              className="transition text-sm hover:opacity-80"
              style={{ color: tv.text.secondary }}
            >
              ← Back to Typing
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 p-6 flex justify-center gap-8">
        <Link
          to="/about"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: tv.text.secondary }}
        >
          About
        </Link>
        <Link
          to="/privacy"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: tv.text.secondary }}
        >
          Privacy
        </Link>
        <Link
          to="/tos"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: tv.text.secondary }}
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}
