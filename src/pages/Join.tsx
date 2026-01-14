// src/pages/Join.tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/useSessionId";

export default function Join() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") || "Guest";
  const code = searchParams.get("code")?.toUpperCase() || "";
  const sessionId = useSessionId();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const joinRoom = useMutation(api.participants.join);

  // Get room data reactively
  const room = useQuery(api.rooms.getByCode, code ? { code } : "skip");

  // Get all participants reactively
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Join room on mount
  useEffect(() => {
    if (!sessionId || !code || isJoining || participantId) return;

    const doJoin = async () => {
      setIsJoining(true);
      try {
        const result = await joinRoom({
          roomCode: code,
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

  // Check if kicked (derived state, no effect needed)
  const wasKicked = participantId && participants && !currentParticipant;

  if (error || wasKicked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-xl mb-4">
          {error || "You have been removed from the room"}
        </p>
        <Link to="/connect">
          <Button>← Back to Connect</Button>
        </Link>
      </div>
    );
  }

  if (!sessionId || isJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Joining room...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
        Room: {code}
      </h1>
      <p className="text-lg mb-4 text-[var(--text-secondary)]">
        Joined as: {name}
      </p>

      {/* Room Status */}
      <div className="mb-8">
        {room?.status === "active" ? (
          <span className="px-4 py-2 bg-green-600 rounded-full text-white">
            Test Active
          </span>
        ) : (
          <span className="px-4 py-2 bg-yellow-600 rounded-full text-white">
            Waiting for host to start...
          </span>
        )}
      </div>

      {/* Your Stats */}
      {currentParticipant && (
        <div className="w-full max-w-md p-6 rounded-lg bg-[var(--surface)] mb-8">
          <h2 className="text-xl font-bold mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">WPM</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.wpm}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Accuracy</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.accuracy.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Progress</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.progress.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Status</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.isFinished ? "✓ Done" : "Typing..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other Participants */}
      <div className="w-full max-w-md p-6 rounded-lg bg-[var(--surface)]">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        {participants && participants.length > 0 ? (
          <ul className="space-y-2">
            {[...participants]
              .sort((a, b) => b.stats.wpm - a.stats.wpm)
              .map((p, i) => (
                <li
                  key={p._id}
                  className={`flex items-center justify-between p-2 rounded ${
                    p._id === participantId
                      ? "bg-[var(--brand-primary)]/20"
                      : "bg-[var(--bg-primary)]"
                  }`}
                >
                  <span>
                    #{i + 1} {p.name}
                    {p._id === participantId && " (You)"}
                  </span>
                  <span className="font-mono">
                    {p.stats.wpm} WPM
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)]">No participants yet</p>
        )}
      </div>

      <Link to="/connect" className="mt-8">
        <Button variant="ghost">← Leave Room</Button>
      </Link>
    </div>
  );
}
