import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { TypingStats } from "@/components/typing/TypingArea";

export function raceStats(stats: TypingStats) {
  return {
    wpm: stats.wpm,
    accuracy: stats.accuracy,
    progress: stats.progress,
    wordsTyped: Math.floor(stats.correctChars / 5),
    timeElapsed: stats.elapsedMs,
    isFinished: stats.isFinished,
  };
}

/** Single trailing snapshot, at most two writes per second and one write in flight. */
export function useRaceProgress(
  participantId: Id<"participants">,
  raceStartTime: number,
  resetVersion: number,
  active: boolean,
) {
  const credential = useMultiplayerCredential();
  const updateProgress = useMutation(api.participants.updateProgress);
  const queued = useRef<TypingStats | null>(null);
  const lastSignature = useRef("");
  const lastSent = useRef(-Infinity);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const stopped = useRef(false);
  const [progressError, setProgressError] = useState("");

  const cancel = useCallback(() => {
    stopped.current = true;
    queued.current = null;
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  useEffect(() => {
    stopped.current = !active;
    return cancel;
  }, [active, cancel]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (inFlight.current) await inFlight.current;
    const stats = queued.current;
    if (!stats || stopped.current) return;
    queued.current = null;
    const signature = JSON.stringify(stats);
    if (signature === lastSignature.current) return;
    lastSent.current = Date.now();
    const write = updateProgress({ credential,
      participantId,
      raceStartTime,
      resetVersion,
      typedText: stats.typedText,
      typedProgress: stats.correctChars,
      stats: { ...raceStats(stats), isFinished: false },
    })
      .then(() => {
        lastSignature.current = signature;
        setProgressError("");
      })
      .catch(() => {
        if (!queued.current && !stopped.current) queued.current = stats;
        setProgressError(
          "Progress could not sync. Keep typing to retry, or use Retry sync.",
        );
      });
    inFlight.current = write;
    await write;
    inFlight.current = null;
  }, [credential, participantId, raceStartTime, resetVersion, updateProgress]);

  const report = useCallback(
    (stats: TypingStats) => {
      if (stopped.current || (!stats.typedLength && !stats.elapsedMs)) return;
      const signature = JSON.stringify(stats);
      if (
        signature === lastSignature.current ||
        signature === JSON.stringify(queued.current)
      )
        return;
      queued.current = stats;
      if (timer.current === undefined) {
        timer.current = setTimeout(
          () => {
            void flush();
          },
          Math.max(0, 500 - (Date.now() - lastSent.current)),
        );
      }
    },
    [flush],
  );

  return { report, flush, cancel, progressError };
}
