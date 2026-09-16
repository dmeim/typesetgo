import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionId } from "@/hooks/useSessionId";
import { JoinCard } from "@/components/connect";
import TypingPractice from "@/components/typing/TypingPractice";
import type { SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import { RoomButton, RoomPage } from "@/components/connect/RoomUI";
import { useRoomAttempt } from "@/components/connect/use-room-attempt";
import {
  practiceSessionKey,
  resolveRoomSettings,
} from "@/components/connect/room-settings";

type Progress = {
  wpm: number;
  accuracy: number;
  progress: number;
  wordsTyped: number;
  timeElapsed: number;
  isFinished: boolean;
};

function JoinRoomContent({ code, name }: { code: string; name: string }) {
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const join = useMutation(api.participants.join);
  const updateStats = useMutation(api.participants.updateStats);
  const disconnect = useMutation(api.participants.disconnect);
  const room = useQuery(api.rooms.getByCode, { code });
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip",
  );
  const request = useCallback(
    () => join({ roomCode: code, name, sessionId, gameMode: "practice" }),
    [code, name, sessionId, join],
  );
  const attempt = useRoomAttempt(Boolean(sessionId), request);
  const participantId = attempt.value?.participantId;
  const participant = participants?.find((item) => item._id === participantId);
  const seenParticipant = useRef(false);
  useEffect(() => {
    if (participant) seenParticipant.current = true;
  }, [participant]);
  const wasRemoved = Boolean(
    participantId &&
    participants &&
    seenParticipant.current &&
    (!participant || !participant.isConnected),
  );
  const runVersion = room?.runVersion ?? 0;
  const resetVersion = participant?.resetVersion ?? 0;
  const settings = room?.settings as Partial<SettingsState> | undefined;
  const lockedSettings = settings ? resolveRoomSettings(settings) : undefined;
  const sessionKey =
    room && settings
      ? practiceSessionKey(room._id, runVersion, resetVersion, settings)
      : "waiting";
  const active = room?.status === "active" && Boolean(participant?.isConnected);
  const [feedback, setFeedback] = useState("");
  const [leaving, setLeaving] = useState(false);
  const report = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    signature?: string;
    lastSent: number;
    pending?: { stats: Progress; typedText?: string; targetText?: string };
  }>({ lastSent: 0 });

  useEffect(() => {
    const current = report.current;
    current.signature = undefined;
    current.lastSent = 0;
    return () => {
      clearTimeout(current.timer);
      current.pending = undefined;
    };
  }, [sessionKey, active]);

  const handleStatsUpdate = useCallback(
    (stats: Progress, typedText?: string, targetText?: string) => {
      if (!participantId || !active) return;
      const current = report.current;
      const signature = JSON.stringify([stats, typedText, targetText]);
      if (signature === current.signature) return;
      current.signature = signature;
      current.pending = { stats, typedText, targetText };
      const flush = () => {
        current.timer = undefined;
        const snapshot = current.pending;
        if (!snapshot) return;
        current.pending = undefined;
        current.lastSent = Date.now();
        const args = { participantId, ...snapshot, runVersion, resetVersion };
        void updateStats(args).catch(() =>
          setFeedback("Progress could not be sent. Check your connection."),
        );
      };
      if (stats.isFinished || Date.now() - current.lastSent >= 500) {
        clearTimeout(current.timer);
        flush();
      } else if (!current.timer)
        current.timer = setTimeout(
          flush,
          500 - (Date.now() - current.lastSent),
        );
    },
    [participantId, active, runVersion, resetVersion, updateStats],
  );

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      if (participantId && !wasRemoved) await disconnect({ participantId });
      navigate("/connect");
    } catch {
      setFeedback("Unable to leave the room. Please try again.");
      setLeaving(false);
    }
  };

  if (
    attempt.status === "error" ||
    wasRemoved ||
    (attempt.status === "success" && room === null)
  ) {
    return (
      <RoomPage>
        <div className="mx-auto max-w-md space-y-5 py-12 text-center">
          <h1 className="text-2xl font-semibold">Unable to join room</h1>
          <p role="alert" style={{ color: tv.ui.mutedForeground }}>
            {attempt.error ??
              (wasRemoved
                ? "You have been removed from this room."
                : "This room is no longer available.")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {attempt.status === "error" && (
              <RoomButton onClick={attempt.retry}>Retry</RoomButton>
            )}
            <Link
              to={`/connect?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}`}
              className="rounded border px-3 py-2"
            >
              Edit code
            </Link>
            <Link to="/connect" className="rounded px-3 py-2">
              Back to Connect
            </Link>
          </div>
        </div>
      </RoomPage>
    );
  }
  if (!participantId || !room || !participant)
    return (
      <RoomPage>
        <p role="status" className="py-12 text-center">
          Connecting to room {code}…
        </p>
        <Link to="/connect">Cancel</Link>
      </RoomPage>
    );
  if (!lockedSettings)
    return (
      <RoomPage>
        <p role="status" className="py-12 text-center">
          Waiting for the host to select a plan step.
        </p>
        <RoomButton onClick={handleLeave} disabled={leaving}>
          Leave room
        </RoomButton>
      </RoomPage>
    );
  return (
    <>
      {feedback && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 p-3"
          style={{ backgroundColor: tv.ui.card, color: tv.ui.foreground }}
        >
          {feedback}
          <RoomButton onClick={() => setFeedback("")}>Dismiss</RoomButton>
          <RoomButton onClick={handleLeave} disabled={leaving}>
            Leave room
          </RoomButton>
        </div>
      )}
      <TypingPractice
        key={sessionKey}
        connectMode
        lockedSettings={lockedSettings}
        isTestActive={active}
        onStatsUpdate={handleStatsUpdate}
        onLeave={handleLeave}
      />
    </>
  );
}

export default function Join() {
  const [params] = useSearchParams();
  const code = (params.get("code") ?? "").trim().toUpperCase();
  const name = (params.get("name") ?? "").trim();
  if (!code || !name)
    return (
      <RoomPage>
        <div className="mx-auto max-w-md space-y-6 py-6">
          <Link to="/connect">← Back to Connect</Link>
          <JoinCard />
        </div>
      </RoomPage>
    );
  return <JoinRoomContent key={`${code}:${name}`} code={code} name={name} />;
}
