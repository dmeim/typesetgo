// src/pages/Host.tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/useSessionId";

export default function Host() {
  const [searchParams] = useSearchParams();
  const hostName = searchParams.get("name") || "Host";
  const sessionId = useSessionId();

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = useMutation(api.rooms.create);
  const setStatus = useMutation(api.rooms.setStatus);
  const deleteRoom = useMutation(api.rooms.deleteRoom);
  const kickParticipant = useMutation(api.participants.kick);
  const resetParticipant = useMutation(api.participants.resetStats);

  // Get room data reactively
  const room = useQuery(
    api.rooms.getByCode,
    roomCode ? { code: roomCode } : "skip"
  );

  // Get participants reactively
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Create room on mount
  useEffect(() => {
    if (!sessionId || isCreating || roomCode) return;

    const initRoom = async () => {
      setIsCreating(true);
      try {
        const result = await createRoom({
          hostName,
          hostSessionId: sessionId,
        });
        setRoomCode(result.code);
      } catch (error) {
        console.error("Failed to create room:", error);
      }
      setIsCreating(false);
    };

    initRoom();
  }, [sessionId, hostName, createRoom, isCreating, roomCode]);

  const handleStartTest = async () => {
    if (room) {
      await setStatus({ roomId: room._id, status: "active" });
    }
  };

  const handleStopTest = async () => {
    if (room) {
      await setStatus({ roomId: room._id, status: "waiting" });
    }
  };

  const handleResetAll = async () => {
    if (participants) {
      for (const p of participants) {
        await resetParticipant({ participantId: p._id });
      }
    }
  };

  const handleKick = async (participantId: Id<"participants">) => {
    await kickParticipant({ participantId });
  };

  const handleDeleteRoom = async () => {
    if (room) {
      await deleteRoom({ roomId: room._id });
      setRoomCode(null);
    }
  };

  if (!sessionId) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
        Host Room
      </h1>
      <p className="text-lg mb-4 text-[var(--text-secondary)]">
        Hosting as: {hostName}
      </p>

      {/* Room Code Display */}
      {roomCode && (
        <div className="mb-8 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-[var(--brand-primary)]">
            {roomCode}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        {room?.status === "waiting" ? (
          <Button onClick={handleStartTest}>Start Test</Button>
        ) : (
          <Button onClick={handleStopTest} variant="destructive">
            Stop Test
          </Button>
        )}
        <Button onClick={handleResetAll} variant="outline">
          Reset All
        </Button>
      </div>

      {/* Participants List */}
      <div className="w-full max-w-2xl p-6 rounded-lg bg-[var(--surface)]">
        <h2 className="text-xl font-bold mb-4">
          Participants ({participants?.length || 0})
        </h2>
        {participants && participants.length > 0 ? (
          <ul className="space-y-3">
            {participants.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between p-3 rounded bg-[var(--bg-primary)]"
              >
                <div>
                  <span className="font-medium">{p.name}</span>
                  {p.stats.isFinished && (
                    <span className="ml-2 text-green-500">✓</span>
                  )}
                  <span className="ml-4 text-sm text-[var(--text-secondary)]">
                    {p.stats.wpm} WPM | {p.stats.accuracy.toFixed(0)}%
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleKick(p._id)}
                >
                  Kick
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)]">
            Waiting for participants to join...
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex gap-4">
        <Button variant="destructive" onClick={handleDeleteRoom}>
          Close Room
        </Button>
        <Link to="/connect">
          <Button variant="ghost">← Back</Button>
        </Link>
      </div>
    </div>
  );
}
