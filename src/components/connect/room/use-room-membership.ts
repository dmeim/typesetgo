import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionId } from "@/hooks/useSessionId";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { clearMembership, loadMembership, loadParticipantName, saveMembership } from "@/lib/connect-membership";
import { connectErrorCode, readableError } from "@/components/connect/connect-errors";

export type RoomMembership =
  | { status: "resolving" }
  | { status: "member"; participantId: string }
  | { status: "not_member" }
  | { status: "removed" }
  | { status: "ended" }
  | { status: "error"; message: string };

const RETRY_DELAYS_MS = [1000, 3000, 6000];

/**
 * Resolves this browser's seat in a room: stored membership first, then a
 * server rejoin by session id. Transient failures retry quietly; only
 * definitive answers (not a member, removed, ended) leave the member state.
 */
/** `ready` holds the first server rejoin until sign-in has settled, so a signed-in seat is not refused while auth loads. */
export function useRoomMembership(roomId: string, ready = true) {
  const sessionId = useSessionId();
  const credential = useMultiplayerCredential();
  const rejoinMutation = useMutation(api.connect.rejoin);
  const [membership, setMembership] = useState<RoomMembership>(() => {
    const stored = loadMembership(roomId);
    return stored ? { status: "member", participantId: stored.participantId } : { status: "resolving" };
  });
  const requestRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  const rejoin = useCallback(function run(failures = 0): Promise<void> {
    const request = ++requestRef.current;
    clearTimeout(retryTimerRef.current);
    return rejoinMutation({ roomId, sessionId, credential }).then(({ participantId }) => {
      if (!mountedRef.current || request !== requestRef.current) return;
      saveMembership(roomId, { participantId, name: loadMembership(roomId)?.name ?? loadParticipantName() });
      setMembership({ status: "member", participantId });
    }, (error: unknown) => {
      if (!mountedRef.current || request !== requestRef.current) return;
      const code = connectErrorCode(error);
      if (code === "not_member") {
        clearMembership(roomId);
        setMembership({ status: "not_member" });
      } else if (code === "removed") {
        setMembership({ status: "removed" });
      } else if (code === "ended" || code === "missing") {
        clearMembership(roomId);
        setMembership({ status: "ended" });
      } else if (failures < RETRY_DELAYS_MS.length) {
        retryTimerRef.current = setTimeout(() => { void run(failures + 1); }, RETRY_DELAYS_MS[failures]);
      } else {
        console.warn("Connect rejoin failed", { roomId, error: readableError(error) });
        // A known seat keeps typing locally; the heartbeat retries reconnection.
        setMembership((current) => current.status === "member" ? current
          : { status: "error", message: readableError(error, "Could not reach the room. Check your connection and try again.") });
      }
    });
  }, [roomId, sessionId, credential, rejoinMutation]);

  /** Drops a stored seat the server no longer recognises and resolves again by session id. */
  const recoverStaleSeat = useCallback(() => {
    clearMembership(roomId);
    setMembership({ status: "resolving" });
    void rejoin();
  }, [roomId, rejoin]);

  const retry = useCallback(() => {
    setMembership({ status: "resolving" });
    void rejoin();
  }, [rejoin]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
    };
  }, []);

  const needsRejoin = useRef(membership.status === "resolving");
  useEffect(() => {
    if (!ready || !needsRejoin.current) return;
    needsRejoin.current = false;
    void rejoin();
  }, [ready, rejoin]);

  return { membership, rejoin, recoverStaleSeat, retry };
}
