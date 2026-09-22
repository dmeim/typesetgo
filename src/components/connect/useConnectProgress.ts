import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";

type Progress = { wpm: number; accuracy: number; progress: number; wordsTyped: number; timeElapsed: number; isFinished: boolean };
type Snapshot = { stats: Progress; typedText?: string; targetText?: string };

/** Acknowledges successful writes only; failed finals remain available for explicit retry. */
export function useConnectProgress(participantId: Id<"participants"> | undefined, runVersion: number, resetVersion: number, active: boolean, sessionKey: string) {
  const credential = useMultiplayerCredential();
  const updateStats = useMutation(api.participants.updateStats);
  const identity = `${sessionKey}:${active}`;
  const [failure, setFailure] = useState({ identity, message: "" });
  const error = failure.identity === identity ? failure.message : "";
  const delivery = useRef({ epoch: 0, active: false, ack: "", lastSent: -Infinity, queued: null as Snapshot | null, inFlight: false, timer: undefined as ReturnType<typeof setTimeout> | undefined });
  useEffect(() => {
    const current = delivery.current;
    current.epoch++;
    current.active = active;
    current.ack = "";
    current.queued = null;
    current.inFlight = false;
    current.lastSent = -Infinity;
    return () => { current.epoch++; current.active = false; current.queued = null; clearTimeout(current.timer); current.timer = undefined; };
  }, [sessionKey, active]);

  const flush = useCallback(async () => {
    const current = delivery.current;
    clearTimeout(current.timer);
    current.timer = undefined;
    if (!participantId || !current.active || current.inFlight) return;
    const epoch = current.epoch;
    current.inFlight = true;
    try {
      while (current.queued && current.active && current.epoch === epoch) {
        const snapshot = current.queued;
        const signature = JSON.stringify(snapshot);
        current.queued = null;
        if (signature === current.ack) continue;
        current.lastSent = Date.now();
        try {
          await updateStats({ participantId, credential, runVersion, resetVersion, ...snapshot });
          if (current.epoch !== epoch) return;
          current.ack = signature;
          setFailure({ identity, message: "" });
        } catch {
          if (current.epoch !== epoch) return;
          current.queued ??= snapshot;
          setFailure({ identity, message: "Progress could not be sent. Retry sync to save your latest progress." });
          return;
        }
      }
    } finally {
      if (current.epoch === epoch) current.inFlight = false;
    }
  }, [identity, participantId, credential, runVersion, resetVersion, updateStats]);

  const report = useCallback((stats: Progress, typedText?: string, targetText?: string) => {
    const current = delivery.current;
    if (!active || !current.active) return;
    const snapshot = { stats, typedText, targetText };
    if (JSON.stringify(snapshot) === current.ack) return;
    current.queued = snapshot;
    if (stats.isFinished || Date.now() - current.lastSent >= 500) void flush();
    else if (!current.timer) current.timer = setTimeout(() => { void flush(); }, 500 - (Date.now() - current.lastSent));
  }, [active, flush]);
  return { report, retry: flush, error };
}
