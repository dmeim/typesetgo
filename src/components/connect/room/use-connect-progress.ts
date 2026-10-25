import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ConnectStats } from "@/lib/connect-types";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";

export const PROGRESS_THROTTLE_MS = 500;
export const PROGRESS_RETRY_MS = 2_000;

type Snapshot = { stats: ConnectStats; typedText?: string; targetText?: string };
export type ProgressAttempt = { runVersion: number; stepIndex: number; attempt: number };

/**
 * Sends the current attempt's progress to the room. Writes are throttled, the
 * final snapshot goes immediately, only successful writes are acknowledged, and
 * a failed latest snapshot is kept for an automatic or explicit retry.
 * `accepted: false` means the server moved on (stale attempt), not a failure.
 */
export function useConnectProgress(participantId: string | undefined, attemptKey: string, attempt: ProgressAttempt, active: boolean) {
  const credential = useMultiplayerCredential();
  const reportProgress = useMutation(api.connect.reportProgress);
  const identity = `${attemptKey}:${active}`;
  const [status, setStatus] = useState({ identity, failed: false, finalDelivered: false });
  const delivery = useRef({
    epoch: 0, active: false, ack: "", lastSent: -Infinity, queued: null as Snapshot | null, inFlight: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  const attemptRef = useRef(attempt);
  useEffect(() => { attemptRef.current = attempt; });

  useEffect(() => {
    const current = delivery.current;
    current.epoch++;
    current.active = active;
    current.ack = "";
    current.queued = null;
    current.inFlight = false;
    current.lastSent = -Infinity;
    return () => {
      current.epoch++;
      current.active = false;
      current.queued = null;
      clearTimeout(current.timer);
      current.timer = undefined;
    };
  }, [attemptKey, active]);

  const flush = useCallback(async () => {
    const current = delivery.current;
    clearTimeout(current.timer);
    current.timer = undefined;
    if (!participantId || !current.active || current.inFlight) return;
    const epoch = current.epoch;
    const target = attemptRef.current;
    current.inFlight = true;
    try {
      while (current.queued && current.active && current.epoch === epoch) {
        const snapshot = current.queued;
        const signature = JSON.stringify(snapshot);
        if (signature === current.ack) {
          current.queued = null;
          continue;
        }
        // Snapshots queued during a write still respect the throttle; finals never wait.
        const wait = PROGRESS_THROTTLE_MS - (Date.now() - current.lastSent);
        if (!snapshot.stats.isFinished && wait > 0) {
          current.timer ??= setTimeout(() => { void flush(); }, wait);
          break;
        }
        current.queued = null;
        current.lastSent = Date.now();
        try {
          await reportProgress({ participantId: participantId as Id<"connectParticipants">, credential, ...target, ...snapshot });
          if (current.epoch !== epoch) return;
          current.ack = signature;
          setStatus({ identity, failed: false, finalDelivered: snapshot.stats.isFinished });
        } catch (error) {
          if (current.epoch !== epoch) return;
          current.queued ??= snapshot;
          console.warn("Connect progress not delivered", { participantId, attemptKey, error });
          setStatus((previous) => ({ identity, failed: true, finalDelivered: previous.identity === identity && previous.finalDelivered }));
          current.timer = setTimeout(() => { void flush(); }, PROGRESS_RETRY_MS);
          return;
        }
      }
    } finally {
      if (current.epoch === epoch) current.inFlight = false;
    }
  }, [identity, participantId, attemptKey, credential, reportProgress]);

  const report = useCallback((stats: ConnectStats, typedText?: string, targetText?: string) => {
    const current = delivery.current;
    if (!current.active) return;
    const snapshot = { stats, typedText, targetText };
    if (JSON.stringify(snapshot) === current.ack) return;
    current.queued = snapshot;
    if (current.inFlight) return;
    const wait = PROGRESS_THROTTLE_MS - (Date.now() - current.lastSent);
    if (stats.isFinished || wait <= 0) void flush();
    else if (!current.timer) current.timer = setTimeout(() => { void flush(); }, wait);
  }, [flush]);

  const view = status.identity === identity ? status : { failed: false, finalDelivered: false };
  return { report, retry: flush, failed: view.failed, finalDelivered: view.finalDelivered };
}
